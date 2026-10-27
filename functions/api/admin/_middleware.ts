import { isAdmin, json, type Env } from '../../../server/lib'

const PUBLIC = ['/api/admin/login', '/api/admin/logout']

export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  if (PUBLIC.includes(new URL(request.url).pathname)) return next()
  if (!env.ADMIN_PASSWORD) return json({ error: 'no-password-configured' }, 500)
  if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401)
  return next()
}
