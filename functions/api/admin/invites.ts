import { cleanGuests, json, newCode, newInviteId, now, readJson, str, toInvite, type Env } from '../../../server/lib'

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare('SELECT * FROM invites ORDER BY created_at DESC').all()
  return json(results.map((r) => toInvite(r as never)))
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson(request)
  const guests = cleanGuests(body.guests)
  if (guests.length === 0) return json({ error: 'no-guests' }, 400)
  const id = newInviteId()
  await env.DB.prepare('INSERT INTO invites (id, code, label, greeting, guests, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, newCode(), str(body.label, 200), str(body.greeting), JSON.stringify(guests), now())
    .run()
  const row = await env.DB.prepare('SELECT * FROM invites WHERE id = ?').bind(id).first()
  return json(toInvite(row as never), 201)
}
