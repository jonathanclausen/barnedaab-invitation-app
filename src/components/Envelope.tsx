import { useEffect, useState, type ReactNode } from 'react'
import { Ornament } from './Ornament'

type Stage = 'closed' | 'opening' | 'rising' | 'leaving'

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Kuvert der åbner sig og lader brevet glide op. Når `open` bliver true,
 * spilles animationen, og `onOpened` kaldes når den er færdig.
 */
export function Envelope({
  addressee,
  title,
  monogram,
  open,
  onOpened,
  letter,
}: {
  addressee?: string
  title: string
  monogram: string
  open: boolean
  onOpened: () => void
  letter: ReactNode
}) {
  const [stage, setStage] = useState<Stage>('closed')

  useEffect(() => {
    if (!open) return
    if (reducedMotion()) {
      onOpened()
      return
    }
    const timers = [
      setTimeout(() => setStage('opening'), 700),
      setTimeout(() => setStage('rising'), 1300),
      setTimeout(() => setStage('leaving'), 2900),
      setTimeout(onOpened, 3500),
    ]
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <div className={`envelope-scene stage-${stage}`}>
      <div className="envelope">
        <div className="envelope-back" />
        <div className="envelope-letter">
          <Ornament />
          {letter}
        </div>
        <svg className="envelope-front" viewBox="0 0 400 260" preserveAspectRatio="none" aria-hidden="true">
          <polygon points="0,0 200,140 0,260" className="flap-side" />
          <polygon points="400,0 200,140 400,260" className="flap-side" />
          <polygon points="0,260 200,128 400,260" className="flap-bottom" />
        </svg>
        <div className="envelope-address">
          {addressee ? (
            <>
              <span className="envelope-to">Til</span>
              <span className="envelope-name">{addressee}</span>
            </>
          ) : (
            <span className="envelope-name">{title}</span>
          )}
        </div>
        <div className="envelope-flap" />
        <div className="envelope-seal" aria-hidden="true">{monogram.slice(0, 2) || '✦'}</div>
      </div>
    </div>
  )
}
