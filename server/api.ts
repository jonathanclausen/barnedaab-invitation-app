import {
  checkPassword,
  clientIp,
  countAttempt,
  isLimited,
  type Limit,
  cleanGuests,
  clearCookie,
  findInvite,
  getEvent,
  getInviteRow,
  isAdmin,
  json,
  logEvent,
  newCode,
  newInviteId,
  now,
  readJson,
  sessionCookie,
  str,
  toGuestInvite,
  toInvite,
  type Answer,
  type Env,
} from './lib'

// Forkerte koder: 10 pr. invitation og 30 pr. IP pr. kvarter. Et 4-cifret gæt tager så dage, ikke minutter.
const codeLimits = (request: Request, id: string): Limit[] => [
  { key: `code:${id}`, max: 10, windowMinutes: 15 },
  { key: `code-ip:${clientIp(request)}`, max: 30, windowMinutes: 15 },
]
// Admin-login: 5 forkerte pr. IP og 30 i alt pr. kvarter
const loginLimits = (request: Request): Limit[] => [
  { key: `login-ip:${clientIp(request)}`, max: 5, windowMinutes: 15 },
  { key: 'login-all', max: 30, windowMinutes: 15 },
]
const tooMany = () => json({ error: 'too-many-attempts' }, 429)

/** Slår invitationen op og tæller forkerte koder */
async function checkCode(request: Request, env: Env, id: string, code: unknown) {
  const limits = codeLimits(request, id)
  if (await isLimited(env, limits)) return 'limited' as const
  const row = await findInvite(env, id, code)
  if (!row) await countAttempt(env, limits)
  return row
}

type Ctx = { request: Request; env: Env; params: Record<string, string> }
type Handler = (ctx: Ctx) => Promise<Response>

const EVENT_FIELDS = [
  'siteTitle', 'monogram', 'title', 'intro', 'date', 'churchTime', 'church', 'churchAddress', 'churchParking', 'receptionParking',
  'reception', 'receptionAddress', 'receptionTime', 'rsvpBy', 'practical', 'wishlistUrl', 'wishlistText', 'signature',
]

// ---------- Offentligt ----------

/** Sidens navn og monogram, som vises før gæsten har tastet koden */
const site: Handler = async ({ env }) => {
  const event = await getEvent(env)
  return json({ siteTitle: event.siteTitle ?? '', monogram: event.monogram ?? '' })
}

/** Gæsten taster koden: returnerer invitationen og tæller en åbning */
const openInvite: Handler = async ({ request, env, params }) => {
  const body = await readJson<{ code?: string; preview?: boolean }>(request)
  const row = await checkCode(request, env, params.id, body.code)
  if (row === 'limited') return tooMany()
  if (!row) return json({ error: 'wrong-code' }, 404)

  const preview = body.preview === true && (await isAdmin(request, env))
  if (!preview) {
    const t = now()
    await env.DB.prepare(
      'UPDATE invites SET open_count = open_count + 1, last_opened_at = ?, first_opened_at = COALESCE(first_opened_at, ?) WHERE id = ?',
    )
      .bind(t, t, row.id)
      .run()
    await logEvent(env, request, row.id, 'open', t)
  }
  return json({ invite: toGuestInvite(row), event: await getEvent(env) })
}

/** Tæller besøg på linket, også før koden er tastet */
const visit: Handler = async ({ request, env, params }) => {
  if (!(await isAdmin(request, env))) {
    const t = now()
    const { meta } = await env.DB.prepare('UPDATE invites SET link_visits = link_visits + 1, last_visit_at = ? WHERE id = ?')
      .bind(t, params.id)
      .run()
    if (meta.changes > 0) await logEvent(env, request, params.id, 'visit', t)
  }
  return json({ ok: true })
}

const rsvp: Handler = async ({ request, env, params }) => {
  const body = await readJson<{ code?: string; rsvp?: Record<string, unknown>; note?: unknown }>(request)
  const row = await checkCode(request, env, params.id, body.code)
  if (row === 'limited') return tooMany()
  if (!row) return json({ error: 'wrong-code' }, 404)
  // Højst 20 svar pr. invitation i timen, så ingen kan oversvømme historikken
  const rsvpLimit = [{ key: `rsvp:${row.id}`, max: 20, windowMinutes: 60 }]
  if (await isLimited(env, rsvpLimit)) return tooMany()
  await countAttempt(env, rsvpLimit)

  const guestIds = (JSON.parse(row.guests) as { id: string }[]).map((g) => g.id)
  const answers: Record<string, Answer> = {}
  for (const id of guestIds) {
    const a = body.rsvp?.[id]
    if (a === 'yes' || a === 'no') answers[id] = a
  }
  if (Object.keys(answers).length !== guestIds.length) return json({ error: 'missing-answers' }, 400)

  const note = str(body.note)
  const t = now()
  await env.DB.prepare('UPDATE invites SET rsvp = ?, note = ?, responded_at = ? WHERE id = ?')
    .bind(JSON.stringify(answers), note, t, row.id)
    .run()
  const guests = JSON.parse(row.guests) as { id: string; name: string }[]
  const named = (r: Record<string, string>) => Object.fromEntries(guests.map((g) => [g.name, r[g.id] ?? null]))
  await logEvent(env, request, row.id, 'rsvp', t, {
    answers: named(answers),
    note,
    ...(row.responded_at ? { previous: { answers: named(JSON.parse(row.rsvp)), note: row.note } } : {}),
  })
  return json({ invite: { ...toGuestInvite(row), rsvp: answers, note, respondedAt: t } })
}

const login: Handler = async ({ request, env }) => {
  if (!env.ADMIN_PASSWORD) return json({ error: 'no-password-configured' }, 500)
  const limits = loginLimits(request)
  if (await isLimited(env, limits)) return tooMany()
  const { password } = await readJson<{ password?: string }>(request)
  if (!(await checkPassword(env, password))) {
    await countAttempt(env, limits)
    await new Promise((r) => setTimeout(r, 800)) // gør gætteri langsomt
    return json({ error: 'wrong-password' }, 401)
  }
  return json({ ok: true }, 200, { 'set-cookie': await sessionCookie(env) })
}

const logout: Handler = async () => json({ ok: true }, 200, { 'set-cookie': clearCookie })

// ---------- Admin (kræver login) ----------

const me: Handler = async () => json({ ok: true })

const getEventHandler: Handler = async ({ env }) => json(await getEvent(env))

const putEvent: Handler = async ({ request, env }) => {
  const body = await readJson(request)
  const event = Object.fromEntries(
    EVENT_FIELDS.map((f) => [f, typeof body[f] === 'string' ? (body[f] as string).slice(0, 4000) : '']),
  )
  await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('event', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(JSON.stringify(event))
    .run()
  return json(event)
}

const listInvites: Handler = async ({ env }) => {
  const { results } = await env.DB.prepare('SELECT * FROM invites ORDER BY created_at DESC').all()
  return json(results.map((r) => toInvite(r as never)))
}

const createInvite: Handler = async ({ request, env }) => {
  const body = await readJson(request)
  const guests = cleanGuests(body.guests)
  if (guests.length === 0) return json({ error: 'no-guests' }, 400)
  const id = newInviteId()
  await env.DB.prepare('INSERT INTO invites (id, code, label, greeting, guests, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, newCode(), str(body.label, 200), str(body.greeting), JSON.stringify(guests), now())
    .run()
  return json(toInvite((await getInviteRow(env, id))!), 201)
}

const updateInvite: Handler = async ({ request, env, params }) => {
  const row = await getInviteRow(env, params.id)
  if (!row) return json({ error: 'not-found' }, 404)
  const body = await readJson(request)
  const guests = cleanGuests(body.guests)
  if (guests.length === 0) return json({ error: 'no-guests' }, 400)
  // Fjern svar fra personer der er taget af invitationen
  const ids = new Set(guests.map((g) => g.id))
  const kept = Object.fromEntries(Object.entries(JSON.parse(row.rsvp)).filter(([id]) => ids.has(id)))
  await env.DB.prepare('UPDATE invites SET label = ?, greeting = ?, guests = ?, rsvp = ? WHERE id = ?')
    .bind(str(body.label, 200), str(body.greeting), JSON.stringify(guests), JSON.stringify(kept), row.id)
    .run()
  return json(toInvite((await getInviteRow(env, row.id))!))
}

const deleteInvite: Handler = async ({ env, params }) => {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM invites WHERE id = ?').bind(params.id),
    env.DB.prepare('DELETE FROM invite_events WHERE invite_id = ?').bind(params.id),
  ])
  return json({ ok: true })
}

/** Nulstil tællere, f.eks. efter man selv har testet linket */
const resetOpens: Handler = async ({ env, params }) => {
  await env.DB.prepare(
    'UPDATE invites SET open_count = 0, first_opened_at = NULL, last_opened_at = NULL, link_visits = 0, last_visit_at = NULL WHERE id = ?',
  )
    .bind(params.id)
    .run()
  // Svar bliver i historikken, besøg og åbninger ryger
  await env.DB.prepare("DELETE FROM invite_events WHERE invite_id = ? AND type IN ('visit', 'open')").bind(params.id).run()
  return json({ ok: true })
}

const history: Handler = async ({ env, params }) => {
  const { results } = await env.DB.prepare(
    'SELECT type, at, device, data FROM invite_events WHERE invite_id = ? ORDER BY at DESC, id DESC LIMIT 500',
  )
    .bind(params.id)
    .all<{ type: string; at: string; device: string; data: string }>()
  return json(results.map((r) => ({ ...r, data: JSON.parse(r.data) })))
}

/** Web-app-manifest, så invitationen kan lægges på hjemmeskærmen og åbne direkte */
const manifest: Handler = async ({ request, env }) => {
  const start = new URL(request.url).searchParams.get('start') ?? '/'
  const event = await getEvent(env)
  const name = event.siteTitle || 'Invitation'
  return json(
    {
      name,
      short_name: name.length > 14 ? 'Invitation' : name,
      start_url: start.startsWith('/i/') ? start : '/',
      scope: '/',
      display: 'standalone',
      background_color: '#f7f2ea',
      theme_color: '#f7f2ea',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    200,
    { 'content-type': 'application/manifest+json' },
  )
}

// ---------- Routing ----------

type Route = [method: string, pattern: string, handler: Handler, admin?: boolean]

const routes: Route[] = [
  ['GET', '/api/site', site],
  ['GET', '/api/manifest', manifest],
  ['POST', '/api/invite/:id/open', openInvite],
  ['POST', '/api/invite/:id/visit', visit],
  ['POST', '/api/invite/:id/rsvp', rsvp],
  ['POST', '/api/admin/login', login],
  ['POST', '/api/admin/logout', logout],
  ['GET', '/api/admin/me', me, true],
  ['GET', '/api/admin/event', getEventHandler, true],
  ['PUT', '/api/admin/event', putEvent, true],
  ['GET', '/api/admin/invites', listInvites, true],
  ['POST', '/api/admin/invites', createInvite, true],
  ['PUT', '/api/admin/invites/:id', updateInvite, true],
  ['DELETE', '/api/admin/invites/:id', deleteInvite, true],
  ['POST', '/api/admin/invites/:id/reset', resetOpens, true],
  ['GET', '/api/admin/invites/:id/history', history, true],
]

function match(pattern: string, path: string) {
  const p = pattern.split('/')
  const s = path.replace(/\/$/, '').split('/')
  if (p.length !== s.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i])
    else if (p[i] !== s[i]) return null
  }
  return params
}

export async function handleApi(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname
  let pathMatched = false
  for (const [method, pattern, handler, admin] of routes) {
    const params = match(pattern, path)
    if (!params) continue
    pathMatched = true
    if (method !== request.method) continue
    if (admin) {
      if (!env.ADMIN_PASSWORD) return json({ error: 'no-password-configured' }, 500)
      if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401)
    }
    return handler({ request, env, params })
  }
  return json({ error: pathMatched ? 'method-not-allowed' : 'not-found' }, pathMatched ? 405 : 404)
}
