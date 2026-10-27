import { checkPassword, json, readJson, sessionCookie, type Env } from '../../../server/lib'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { password } = await readJson<{ password?: string }>(request)
  if (!(await checkPassword(env, password))) {
    await new Promise((r) => setTimeout(r, 800)) // gør gætteri langsomt
    return json({ error: 'wrong-password' }, 401)
  }
  return json({ ok: true }, 200, { 'set-cookie': await sessionCookie(env) })
}
