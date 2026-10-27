import { getEvent, json, type Env } from '../../server/lib'

// Sidens navn og monogram, som vises før gæsten har tastet koden
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const event = await getEvent(env)
  return json({ siteTitle: event.siteTitle ?? '', monogram: event.monogram ?? '' })
}
