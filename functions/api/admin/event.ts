import { getEvent, json, readJson, type Env } from '../../../server/lib'

const FIELDS = [
  'siteTitle', 'monogram',
  'title', 'intro', 'date', 'churchTime', 'church', 'churchAddress',
  'reception', 'receptionAddress', 'receptionTime', 'rsvpBy', 'practical', 'signature',
]

export const onRequestGet: PagesFunction<Env> = async ({ env }) => json(await getEvent(env))

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson(request)
  const event = Object.fromEntries(FIELDS.map((f) => [f, typeof body[f] === 'string' ? (body[f] as string).slice(0, 4000) : '']))
  await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('event', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(JSON.stringify(event))
    .run()
  return json(event)
}
