// "Gem på hjemmeskærmen". Android/Chrome har en rigtig installer-dialog,
// iPhone har ikke, så der viser vi en kort vejledning i stedet.

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()

export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallPromptEvent
    listeners.forEach((l) => l())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((l) => l())
  })
}

export const onInstallChange = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const canPrompt = () => deferred !== null

export async function promptInstall() {
  if (!deferred) return false
  await deferred.prompt()
  const { outcome } = await deferred.userChoice
  deferred = null
  return outcome === 'accepted'
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

const ua = () => navigator.userAgent
export const isIos = () => /iPhone|iPad|iPod/.test(ua()) || (/Macintosh/.test(ua()) && 'ontouchend' in document)
/** Messenger, Facebook og Instagram åbner links i deres egen browser, som ikke kan gemme på hjemmeskærmen */
export const isInAppBrowser = () => /FBAN|FBAV|FB_IAB|Instagram|Messenger/i.test(ua())
export const isMobile = () => isIos() || /Android/i.test(ua())

/** Peg manifestet på gæstens egen invitation, så ikonet åbner den direkte */
export function setManifestStart(path: string) {
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  if (link) link.href = `/api/manifest?start=${encodeURIComponent(path)}`
}
