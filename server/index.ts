import { handleApi } from './api'
import type { Env } from './lib'

// Worker: alle forespørgsler går først herigennem (se wrangler.toml).
// www.<domæne> sendes videre til <domæne>, /api/* håndteres her,
// og alt andet serveres fra dist/.
export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4)
      return Response.redirect(url.toString(), 301)
    }

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request)
    }

    try {
      return await handleApi(request, env)
    } catch (e) {
      console.error(e)
      return new Response(JSON.stringify({ error: 'server-error' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    }
  },
} satisfies ExportedHandler<Env & { ASSETS: Fetcher }>
