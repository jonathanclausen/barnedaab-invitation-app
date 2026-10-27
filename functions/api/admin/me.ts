import { json } from '../../../server/lib'

// Middleware har allerede tjekket sessionen
export const onRequestGet: PagesFunction = async () => json({ ok: true })
