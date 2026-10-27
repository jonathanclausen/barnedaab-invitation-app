import { cleanGuests, getInviteRow, json, readJson, str, toInvite, type Env } from '../../../../server/lib'

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const row = await getInviteRow(env, String(params.id))
  if (!row) return json({ error: 'not-found' }, 404)
  const body = await readJson(request)
  const guests = cleanGuests(body.guests)
  if (guests.length === 0) return json({ error: 'no-guests' }, 400)
  // Fjern svar fra personer der er taget af invitationen
  const ids = new Set(guests.map((g) => g.id))
  const rsvp = Object.fromEntries(Object.entries(JSON.parse(row.rsvp)).filter(([id]) => ids.has(id)))
  await env.DB.prepare('UPDATE invites SET label = ?, greeting = ?, guests = ?, rsvp = ? WHERE id = ?')
    .bind(str(body.label, 200), str(body.greeting), JSON.stringify(guests), JSON.stringify(rsvp), row.id)
    .run()
  return json(toInvite((await getInviteRow(env, row.id))!))
}

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  await env.DB.prepare('DELETE FROM invites WHERE id = ?').bind(String(params.id)).run()
  return json({ ok: true })
}
