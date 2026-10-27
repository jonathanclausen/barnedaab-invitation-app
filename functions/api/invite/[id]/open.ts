import { findInvite, getEvent, isAdmin, json, now, readJson, toGuestInvite, type Env } from '../../../../server/lib'

// Gæsten taster koden: returnerer invitationen og tæller en åbning
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const body = await readJson<{ code?: string; preview?: boolean }>(request)
  const row = await findInvite(env, String(params.id), body.code)
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
