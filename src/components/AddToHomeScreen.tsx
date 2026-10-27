import { useEffect, useState } from 'react'
import { canPrompt, isInAppBrowser, isIos, isMobile, isStandalone, onInstallChange, promptInstall } from '../install'

export function AddToHomeScreen() {
  const [, rerender] = useState(0)
  const [help, setHelp] = useState(false)

  useEffect(() => {
    const off = onInstallChange(() => rerender((n) => n + 1))
    return () => {
      off()
    }
  }, [])

  if (isStandalone() || !(isMobile() || canPrompt())) return null

  async function click() {
    if (canPrompt()) await promptInstall()
    else setHelp((h) => !h)
  }

  return (
    <section className="card homescreen fade-in">
      <div className="homescreen-row">
        <img src="/apple-touch-icon.png" alt="" width={44} height={44} />
        <div>
          <strong>Gem invitationen på hjemmeskærmen</strong>
          <p className="muted small">Så har du den lige ved hånden på dagen.</p>
        </div>
      </div>
      <button className="btn btn--ghost btn--block" onClick={click}>
        Gem på hjemmeskærmen
      </button>
      {help && (
        <div className="homescreen-help">
          {isInAppBrowser() ? (
            <p>
              Åbn først siden i {isIos() ? 'Safari' : 'Chrome'}: tryk på <strong>•••</strong> øverst og vælg{' '}
              <strong>Åbn i browser</strong>. Tryk derefter på knappen igen.
            </p>
          ) : isIos() ? (
            <ol>
              <li>
                Tryk på <strong>Del</strong>-knappen <ShareIcon /> nederst i Safari (eller ved adresselinjen).
              </li>
              <li>
                Rul ned og vælg <strong>Føj til hjemmeskærm</strong>.
              </li>
              <li>
                Tryk <strong>Tilføj</strong>.
              </li>
            </ol>
          ) : (
            <p>
              Åbn browserens menu <strong>⋮</strong> og vælg <strong>Føj til startskærm</strong> eller{' '}
              <strong>Installer app</strong>.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

function ShareIcon() {
  return (
    <svg className="share-icon" viewBox="0 0 24 24" aria-label="Del" role="img">
      <path d="M12 3v12M8 7l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 10H5v11h14V10h-2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}
