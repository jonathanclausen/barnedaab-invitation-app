import { isAdmin, json, now, type Env } from '../../../../server/lib'

// Tæller besøg på linket, også før koden er tastet
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!(await isAdmin(request, env))) {
    await env.DB.prepare('UPDATE invites SET link_visits = link_visits + 1, last_visit_at = ? WHERE id = ?')
      .bind(now(), String(params.id))
      .run()
  }
  return json({ ok: true })
}
