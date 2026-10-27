import { useEffect, useState } from 'react'
import { fetchSite } from './api'
import { defaultEvent, type SiteInfo } from './types'

let cached: Promise<SiteInfo> | null = null

/** Sidens navn og monogram fra admin-indstillingerne. Sætter også fanens titel. */
export function useSite(): SiteInfo {
  const [site, setSite] = useState<SiteInfo>({ siteTitle: defaultEvent.siteTitle, monogram: '' })
  useEffect(() => {
    cached ??= fetchSite().catch(() => ({ siteTitle: defaultEvent.siteTitle, monogram: '' }))
    cached.then((s) => {
      setSite(s)
      document.title = s.siteTitle
    })
  }, [])
  return site
}
