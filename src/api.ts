import { defaultEvent, type Answer, type EventSettings, type Guest, type GuestInvite, type Invite, type SiteInfo } from './types'

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'error')
  return data as T
}

export const inviteUrl = (id: string) => `${window.location.origin}/i/${id}`

let guestCounter = 0
export const newGuestId = () => `new${Date.now().toString(36)}${guestCounter++}`

// ---------- Gæst ----------

export const fetchSite = () =>
  call<Partial<SiteInfo>>('GET', 'site').then((s) => ({
    siteTitle: s.siteTitle || defaultEvent.siteTitle,
    monogram: s.monogram ?? '',
  }))

/** Returnerer null hvis link + kode ikke passer. */
export async function openInvite(id: string, code: string, preview: boolean) {
  try {
    const r = await call<{ invite: GuestInvite; event: Partial<EventSettings> }>('POST', `invite/${id}/open`, { code, preview })
    return { invite: r.invite, event: { ...defaultEvent, ...r.event } }
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null
    throw e
  }
}

export const recordLinkVisit = (id: string) => call('POST', `invite/${id}/visit`)

export const submitRsvp = (id: string, code: string, rsvp: Record<string, Answer>, note: string) =>
  call<{ invite: GuestInvite }>('POST', `invite/${id}/rsvp`, { code, rsvp, note }).then((r) => r.invite)

// ---------- Admin ----------

export const adminMe = () => call('GET', 'admin/me')
export const login = (password: string) => call('POST', 'admin/login', { password })
export const logout = () => call('POST', 'admin/logout')

export const listInvites = () => call<Invite[]>('GET', 'admin/invites')
export const createInvite = (label: string, greeting: string, names: string[]) =>
  call<Invite>('POST', 'admin/invites', { label, greeting, guests: names.map((name) => ({ name })) })
export const updateInvite = (id: string, label: string, greeting: string, guests: Guest[]) =>
  call<Invite>('PUT', `admin/invites/${id}`, { label, greeting, guests })
export const deleteInvite = (id: string) => call('DELETE', `admin/invites/${id}`)
export const resetOpens = (id: string) => call('POST', `admin/invites/${id}/reset`)

export const fetchEvent = () =>
  call<Partial<EventSettings>>('GET', 'admin/event').then((e) => ({ ...defaultEvent, ...e }))
export const saveEvent = (event: EventSettings) => call('PUT', 'admin/event', event)
