import { handleApi } from './api'
import type { Env } from './lib'

// Worker: /api/* håndteres her, alt andet serveres fra dist/ (se wrangler.toml)
export default {
  async fetch(request, env) {
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
