import { findInvite, json, now, readJson, str, toGuestInvite, type Answer, type Env } from '../../../../server/lib'

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const body = await readJson<{ code?: string; rsvp?: Record<string, unknown>; note?: unknown }>(request)
  const row = await findInvite(env, String(params.id), body.code)
  if (!row) return json({ error: 'wrong-code' }, 404)

  const guestIds = (JSON.parse(row.guests) as { id: string }[]).map((g) => g.id)
  const rsvp: Record<string, Answer> = {}
  for (const id of guestIds) {
    const a = body.rsvp?.[id]
    if (a === 'yes' || a === 'no') rsvp[id] = a
  }
  if (Object.keys(rsvp).length !== guestIds.length) return json({ error: 'missing-answers' }, 400)

  const note = str(body.note)
  const t = now()
  await env.DB.prepare('UPDATE invites SET rsvp = ?, note = ?, responded_at = ? WHERE id = ?')
    .bind(JSON.stringify(rsvp), note, t, row.id)
    .run()
  return json({ invite: { ...toGuestInvite(row), rsvp, note, respondedAt: t } })
}
