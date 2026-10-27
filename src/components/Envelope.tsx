import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Ornament } from './Ornament'

export type EnvelopeTheme = 'space' | 'unicorn'

type Stage = 'closed' | 'ignite' | 'flying' | 'landed' | 'opening' | 'rising' | 'leaving'

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Hvornår hvert trin starter (ms efter koden er godkendt)
const TIMELINE: [Stage | 'done', number][] = [
  ['ignite', 0],
  ['flying', 1100],
  ['landed', 4900],
  ['opening', 5300],
  ['rising', 6000],
  ['leaving', 7700],
  ['done', 8600],
]

const SPARKS = 18
const DUST_GLYPHS = ['♥', '✦', '★', '♥', '•']
const RAINBOW = ['#ff9eb5', '#ffc29e', '#ffe79e', '#b8e6b0', '#9ed4ff', '#c7b0ff']

/**
 * Kuvert der letter som en raket, flyver en tur rundt i rummet, lander,
 * springer seglet i stjerner og lader brevet glide op. Til sidst suser vi
 * gennem hyperrummet ind i invitationen. Når `open` bliver true, spilles
 * animationen, og `onOpened` kaldes når den er færdig (eller springes over).
 */
export function Envelope({
  addressee,
  title,
  monogram,
  open,
  onOpened,
  letter,
  theme = 'space',
}: {
  addressee?: string
  title: string
  monogram: string
  open: boolean
  onOpened: () => void
  letter: ReactNode
  theme?: EnvelopeTheme
}) {
  const [stage, setStage] = useState<Stage>('closed')
  const finished = useRef(false)
  const envelopeRef = useRef<HTMLDivElement>(null)
  const spaceRef = useRef<HTMLDivElement>(null)

  const finish = () => {
    if (finished.current) return
    finished.current = true
    onOpened()
  }

  useEffect(() => {
    if (!open) return
    if (reducedMotion()) {
      finish()
      return
    }
    const timers = TIMELINE.map(([s, at]) => setTimeout(() => (s === 'done' ? finish() : setStage(s)), at))
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Stjernestøv der drysser efter kuverten, mens den flyver
  useEffect(() => {
    if (stage !== 'flying' && stage !== 'ignite') return
    const space = spaceRef.current
    const env = envelopeRef.current
    if (!space || !env) return
    let frame = 0
    let last = 0
    const tick = (t: number) => {
      frame = requestAnimationFrame(tick)
      if (t - last < 28) return
      last = t
      const r = env.getBoundingClientRect()
      const dust = document.createElement('span')
      dust.className = 'stardust'
      if (theme === 'unicorn') dust.textContent = DUST_GLYPHS[Math.floor(Math.random() * DUST_GLYPHS.length)]
      dust.style.left = `${r.left + r.width / 2 + (Math.random() - 0.5) * r.width * 0.5}px`
      dust.style.top = `${r.top + r.height / 2 + (Math.random() - 0.5) * r.height * 0.5}px`
      dust.style.setProperty('--hue', String(Math.floor(Math.random() * 360)))
      dust.addEventListener('animationend', () => dust.remove())
      space.appendChild(dust)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [stage, theme])

  const stars = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        key: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: `${Math.random() < 0.85 ? 1 + Math.random() * 1.5 : 2.5 + Math.random() * 1.5}px`,
        delay: `${-Math.random() * 4}s`,
        dur: `${2 + Math.random() * 3}s`,
      })),
    [],
  )

  const inSpace = stage !== 'closed'

  return (
    <>
      <div ref={spaceRef} className={`space space--${theme} space--${stage} ${inSpace ? 'is-on' : ''}`} aria-hidden="true">
        <div className="space-stars">
          {stars.map((s) => (
            <span
              key={s.key}
              className="star"
              style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay, animationDuration: s.dur }}
            />
          ))}
        </div>
        {theme === 'space' ? (
          <>
            <div className="nebula" />
            <div className="planet">
              <div className="planet-ring" />
            </div>
            <div className="moon" />
            <span className="shooting-star shooting-star--1" />
            <span className="shooting-star shooting-star--2" />
            <span className="ufo">🛸</span>
          </>
        ) : (
          <>
            <div className="rainbow">
              {RAINBOW.map((c, i) => (
                <span key={c} style={{ borderColor: c, ['--i' as string]: i }} />
              ))}
            </div>
            <span className="cloud cloud--1" />
            <span className="cloud cloud--2" />
            <span className="cloud cloud--3" />
            <span className="cloud cloud--4" />
            <span className="unicorn-friend">🦄</span>
            <div className="hearts">
              {Array.from({ length: 12 }, (_, i) => (
                <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.43) % 4}s` }}>
                  {i % 3 ? '♥' : '✿'}
                </span>
              ))}
            </div>
          </>
        )}
        <div className="warp-flash" />
      </div>

      <div className={`envelope-scene envelope-scene--${theme} stage-${stage}`}>
        <div className="envelope-flight">
          <div className="envelope" ref={envelopeRef}>
            {theme === 'space' ? (
              <div className="rocket-flame" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            ) : (
              <>
                <span className="wing wing--left" aria-hidden="true" />
                <span className="wing wing--right" aria-hidden="true" />
                <span className="unicorn-rider" aria-hidden="true">🦄</span>
              </>
            )}
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
            <div className="seal-sparks" aria-hidden="true">
              {Array.from({ length: SPARKS }, (_, i) => (
                <span key={i} style={{ ['--a' as string]: `${(360 / SPARKS) * i}deg`, ['--d' as string]: `${80 + (i % 3) * 36}px` }}>
                  {theme === 'unicorn' ? (i % 2 ? '♥' : '✦') : i % 2 ? '✦' : '★'}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {inSpace && (
        <button type="button" className={`space-skip space-skip--${theme}`} onClick={finish}>
          Spring over
        </button>
      )}
    </>
  )
}
