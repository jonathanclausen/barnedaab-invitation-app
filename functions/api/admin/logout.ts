import { clearCookie, json } from '../../../server/lib'

export const onRequestPost: PagesFunction = async () => json({ ok: true }, 200, { 'set-cookie': clearCookie })
