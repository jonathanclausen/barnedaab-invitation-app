import { json, type Env } from '../../../../../server/lib'

// Nulstil tællere, f.eks. efter man selv har testet linket
export const onRequestPost: PagesFunction<Env> = async ({ env, params }) => {
  await env.DB.prepare(
    'UPDATE invites SET open_count = 0, first_opened_at = NULL, last_opened_at = NULL, link_visits = 0, last_visit_at = NULL WHERE id = ?',
  )
    .bind(String(params.id))
    .run()
  return json({ ok: true })
}
