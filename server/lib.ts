export interface Env {
  DB: D1Database
  ADMIN_PASSWORD: string
}

export type Answer = 'yes' | 'no'
export interface Guest {
  id: string
  name: string
}

export interface InviteRow {
  id: string
  code: string
  label: string
  greeting: string
  guests: string
  rsvp: string
  note: string
  responded_at: string | null
  open_count: number
  first_opened_at: string | null
  last_opened_at: string | null
  link_visits: number
  last_visit_at: string | null
  created_at: string
}

export function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  })
}

export const now = () => new Date().toISOString()

export function toInvite(row: InviteRow) {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    greeting: row.greeting,
    guests: JSON.parse(row.guests) as Guest[],
    rsvp: JSON.parse(row.rsvp) as Record<string, Answer>,
    note: row.note,
    respondedAt: row.responded_at,
    openCount: row.open_count,
    firstOpenedAt: row.first_opened_at,
    lastOpenedAt: row.last_opened_at,
    linkVisits: row.link_visits,
    lastVisitAt: row.last_visit_at,
    createdAt: row.created_at,
  }
}

/** Det gæsten må se – ingen tællere */
export function toGuestInvite(row: InviteRow) {
  const i = toInvite(row)
  return { id: i.id, label: i.label, greeting: i.greeting, guests: i.guests, rsvp: i.rsvp, note: i.note, respondedAt: i.respondedAt }
}

export async function findInvite(env: Env, id: string, code: unknown) {
  if (typeof code !== 'string' || !code.trim()) return null
  return env.DB.prepare('SELECT * FROM invites WHERE id = ? AND code = ?').bind(id, code.trim()).first<InviteRow>()
}

export async function getInviteRow(env: Env, id: string) {
  return env.DB.prepare('SELECT * FROM invites WHERE id = ?').bind(id).first<InviteRow>()
}

export async function getEvent(env: Env): Promise<Record<string, string>> {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'event'").first<{ value: string }>()
  return row ? JSON.parse(row.value) : {}
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    return {} as T
  }
}

const ID_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
export function randomString(alphabet: string, length: number) {
  const bytes = crypto.getRandomValues(new Uint32Array(length))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}
export const newInviteId = () => randomString(ID_ALPHABET, 8)
export const newCode = () => randomString('0123456789', 4)
export const newGuestId = () => randomString(ID_ALPHABET, 6)

export function cleanGuests(input: unknown): Guest[] {
  if (!Array.isArray(input)) return []
  return input
    .map((g) => ({
      id: typeof g?.id === 'string' && g.id ? g.id.slice(0, 20) : newGuestId(),
      name: typeof g?.name === 'string' ? g.name.trim().slice(0, 100) : '',
    }))
    .filter((g) => g.name)
}

export const str = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

// ---------- Admin-session ----------

const COOKIE = 'admin_session'
const SESSION_DAYS = 30

async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c]!)
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function checkPassword(env: Env, password: unknown) {
  if (!env.ADMIN_PASSWORD || typeof password !== 'string') return false
  // Sammenlign hashes, så længden af kodeordet ikke lækker
  const [a, b] = await Promise.all([hmac('pw', password), hmac('pw', env.ADMIN_PASSWORD)])
  return safeEqual(a, b)
}

export async function sessionCookie(env: Env) {
  const exp = Date.now() + SESSION_DAYS * 864e5
  const token = `${exp}.${await hmac(env.ADMIN_PASSWORD, String(exp))}`
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`
}

export const clearCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`

export async function isAdmin(request: Request, env: Env) {
  if (!env.ADMIN_PASSWORD) return false
  const cookie = request.headers.get('cookie') ?? ''
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`))
  if (!match) return false
  const [exp, sig] = match[1].split('.')
  if (!exp || !sig || Number(exp) < Date.now()) return false
  return safeEqual(sig, await hmac(env.ADMIN_PASSWORD, exp))
}

// ---------- Historik ----------

export type EventType = 'visit' | 'open' | 'rsvp'

/** Groft gæt på enheden ud fra browserens user agent, f.eks. "iPhone" eller "Android" */
export function deviceOf(request: Request) {
  const ua = request.headers.get('user-agent') ?? ''
  const device = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : ''
  const app = /FBAN|FBAV|FB_IAB|Messenger/.test(ua) ? 'Messenger' : /Instagram/.test(ua) ? 'Instagram' : ''
  return [device, app && `via ${app}`].filter(Boolean).join(' ')
}

export function logEvent(env: Env, request: Request, inviteId: string, type: EventType, at: string, data: unknown = {}) {
  return env.DB.prepare('INSERT INTO invite_events (invite_id, type, at, device, data) VALUES (?, ?, ?, ?, ?)')
    .bind(inviteId, type, at, deviceOf(request), JSON.stringify(data))
    .run()
}
