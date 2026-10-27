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
      if (t - last < (theme === 'unicorn' ? 45 : 28)) return
      last = t
      const r = env.getBoundingClientRect()
      const dust = document.createElement('span')
      dust.className = 'stardust'
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
            <div className="halo" />
            <span className="mist mist--1" />
            <span className="mist mist--2" />
            <div className="emblem">
              <UnicornLine />
              <p className="emblem-text">Et lille brev er på vej</p>
            </div>
            <div className="petals">
              {Array.from({ length: 9 }, (_, i) => (
                <span
                  key={i}
                  style={{
                    left: `${(i * 41) % 100}%`,
                    animationDelay: `${-((i * 0.77) % 7)}s`,
                    animationDuration: `${9 + (i % 4) * 1.5}s`,
                    ['--s' as string]: i % 4 === 0 ? 2.4 : 0.8 + (i % 3) * 0.25,
                    filter: i % 4 === 0 ? 'blur(3px)' : undefined,
                  }}
                />
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
                <Wing side="left" />
                <Wing side="right" />
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
                  {theme === 'unicorn' ? '✦' : i % 2 ? '✦' : '★'}
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

/** Enhjørning i en fin guldstreg inde i en cirkel, der tegner sig selv */
function UnicornLine() {
  return (
    <svg className="unicorn-line" viewBox="-14 -14 228 228" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="gold-foil" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e9d3a0" />
          <stop offset="0.45" stopColor="#b8935a" />
          <stop offset="0.7" stopColor="#d9bd84" />
          <stop offset="1" stopColor="#9c7a45" />
        </linearGradient>
        <clipPath id="emblem-clip">
          <circle cx="100" cy="100" r="96" />
        </clipPath>
      </defs>
      <g stroke="url(#gold-foil)">
        <circle className="ring" pathLength="1" cx="100" cy="100" r="104" transform="rotate(-90 100 100)" />
        <circle className="ring ring--inner" pathLength="1" cx="100" cy="100" r="99" transform="rotate(90 100 100)" />
        <g clipPath="url(#emblem-clip)" transform="translate(6 10)">
          <path pathLength="1" d="M62 192 C 58 160, 60 120, 74 96 C 80 84, 84 74, 86 58 C 92 64, 96 70, 100 74 C 116 76, 128 86, 140 100 C 150 110, 160 118, 164 128 C 167 136, 162 142, 154 142 C 146 142, 138 138, 130 134 C 124 140, 118 150, 114 162 C 112 172, 114 182, 120 192" />
          <path pathLength="1" d="M104 74 L 138 20 L 112 80" />
          <path pathLength="1" d="M109 66 L 118 66 M116 55 L 123 54 M123 44 L 128 42 M129 34 L 134 30" />
          <path pathLength="1" d="M118 98 C 121 96, 125 96, 127 99" />
          <path pathLength="1" d="M155 129 C 156 131, 156 133, 154 134" />
          <path pathLength="1" d="M86 62 C 70 68, 60 82, 64 98 C 52 106, 48 120, 56 132 C 44 140, 42 156, 50 166 C 40 172, 36 184, 40 192" />
          <path pathLength="1" d="M84 76 C 74 86, 72 100, 78 110 C 70 120, 70 134, 76 142" />
        </g>
        <path className="twinkle" pathLength="1" d="M168 34 l 0 -10 M163 29 l 10 0 M40 160 l 0 -7 M36.5 156.5 l 7 0 M30 48 l 0 -6 M27 45 l 6 0" />
      </g>
    </svg>
  )
}

/** Fjerlet vinge på kuverten i enhjørning-temaet */
function Wing({ side }: { side: 'left' | 'right' }) {
  return (
    <span className={`wing wing--${side}`} aria-hidden="true">
      <svg viewBox="0 0 100 60">
        <path d="M100 42 C 78 14, 44 2, 2 4 C 20 10, 30 14, 34 18 C 18 18, 10 20, 6 24 C 24 26, 36 28, 40 32 C 26 34, 18 38, 14 44 C 32 42, 46 42, 52 46 C 42 50, 38 54, 36 60 C 56 54, 80 52, 100 42 Z" />
        <path className="wing-vein" d="M96 40 C 70 24, 40 12, 10 7 M90 42 C 66 32, 40 26, 14 24 M84 45 C 64 40, 44 40, 22 42 M76 48 C 62 50, 50 54, 42 57" />
      </svg>
    </span>
  )
}
