import {
  checkPassword,
  cleanGuests,
  clearCookie,
  findInvite,
  getEvent,
  getInviteRow,
  isAdmin,
  json,
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

type Ctx = { request: Request; env: Env; params: Record<string, string> }
type Handler = (ctx: Ctx) => Promise<Response>

const EVENT_FIELDS = [
  'siteTitle', 'monogram', 'title', 'intro', 'date', 'churchTime', 'church', 'churchAddress',
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
  const row = await findInvite(env, params.id, body.code)
  if (!row) return json({ error: 'wrong-code' }, 404)

  const preview = body.preview === true && (await isAdmin(request, env))
  if (!preview) {
    const t = now()
    await env.DB.prepare(
      'UPDATE invites SET open_count = open_count + 1, last_opened_at = ?, first_opened_at = COALESCE(first_opened_at, ?) WHERE id = ?',
    )
      .bind(t, t, row.id)
      .run()
  }
  return json({ invite: toGuestInvite(row), event: await getEvent(env) })
}

/** Tæller besøg på linket, også før koden er tastet */
const visit: Handler = async ({ request, env, params }) => {
  if (!(await isAdmin(request, env))) {
    await env.DB.prepare('UPDATE invites SET link_visits = link_visits + 1, last_visit_at = ? WHERE id = ?')
      .bind(now(), params.id)
      .run()
  }
  return json({ ok: true })
}

const rsvp: Handler = async ({ request, env, params }) => {
  const body = await readJson<{ code?: string; rsvp?: Record<string, unknown>; note?: unknown }>(request)
  const row = await findInvite(env, params.id, body.code)
  if (!row) return json({ error: 'wrong-code' }, 404)

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
  return json({ invite: { ...toGuestInvite(row), rsvp: answers, note, respondedAt: t } })
}

const login: Handler = async ({ request, env }) => {
  if (!env.ADMIN_PASSWORD) return json({ error: 'no-password-configured' }, 500)
  const { password } = await readJson<{ password?: string }>(request)
  if (!(await checkPassword(env, password))) {
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
  await env.DB.prepare('DELETE FROM invites WHERE id = ?').bind(params.id).run()
  return json({ ok: true })
}

/** Nulstil tællere, f.eks. efter man selv har testet linket */
const resetOpens: Handler = async ({ env, params }) => {
  await env.DB.prepare(
    'UPDATE invites SET open_count = 0, first_opened_at = NULL, last_opened_at = NULL, link_visits = 0, last_visit_at = NULL WHERE id = ?',
  )
    .bind(params.id)
    .run()
  return json({ ok: true })
}

// ---------- Routing ----------

type Route = [method: string, pattern: string, handler: Handler, admin?: boolean]

const routes: Route[] = [
  ['GET', '/api/site', site],
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
