// Alle datoer og tidspunkter vises på dansk og i dansk tid (Europe/Copenhagen,
// inkl. sommertid), uanset hvilken tidszone eller hvilket sprog gæstens enhed bruger.
// Formatet bygges selv frem for at stole på browserens da-DK-output, som varierer
// (fx "14.30" vs. "14:30" og om der står "den" foran datoen).

const TZ = 'Europe/Copenhagen'
const WEEKDAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag']
const MONTHS = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december']

const pad = (n: number) => String(n).padStart(2, '0')
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

type Parts = { y: number; m: number; d: number; wd: number; h: number; min: number }

/** "2027-03-14" (kalenderdato uden tid) -> dele. Ingen tidszone-forskydning. */
function parseDay(iso: string): Parts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso?.trim() ?? '')
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const wd = new Date(Date.UTC(y, mo - 1, d)).getUTCDay()
  return { y, m: mo, d, wd, h: 0, min: 0 }
}

const tsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric',
  weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
})
const WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Tidsstempel (fx "2026-11-15T17:07:33Z") -> dele i dansk tid. */
function parseInstant(iso: string): Parts | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const p = Object.fromEntries(tsFormatter.formatToParts(date).map((x) => [x.type, x.value]))
  return {
    y: Number(p.year), m: Number(p.month), d: Number(p.day),
    wd: WD_EN.indexOf(p.weekday), h: Number(p.hour) % 24, min: Number(p.minute),
  }
}

/** "2027-03-14" -> "Søndag den 14. marts 2027" */
export function formatDate(iso: string) {
  if (!iso) return ''
  const p = parseDay(iso)
  return p ? capitalize(`${WEEKDAYS[p.wd]} den ${p.d}. ${MONTHS[p.m - 1]} ${p.y}`) : iso
}

/** "2027-03-14" -> "14. marts" (med årstal hvis det ikke er i år: "14. marts 2027") */
export function formatShortDate(iso: string) {
  if (!iso) return ''
  const p = parseDay(iso)
  if (!p) return iso
  const thisYear = parseInstant(new Date().toISOString())?.y
  return `${p.d}. ${MONTHS[p.m - 1]}${p.y !== thisYear ? ` ${p.y}` : ''}`
}

/** "2027-03-14" -> "14.03.2027" */
export function formatNumericDate(iso: string) {
  if (!iso) return ''
  const p = parseDay(iso)
  return p ? `${pad(p.d)}.${pad(p.m)}.${p.y}` : iso
}

/** "9:5" / "09:05" / "14.30" -> "09:05" / "14:30" (24-timers ur) */
export function formatTime(hhmm: string) {
  if (!hhmm) return ''
  const m = /^(\d{1,2})[:.](\d{2})/.exec(hhmm.trim())
  return m ? `${pad(Number(m[1]))}:${m[2]}` : hhmm
}

/** Tidsstempel -> "15.11.2026 kl. 18:07" i dansk tid. */
export function formatTimestamp(iso: string | null | undefined) {
  if (!iso) return ''
  const p = parseInstant(iso)
  return p ? `${pad(p.d)}.${pad(p.m)}.${p.y} kl. ${pad(p.h)}:${pad(p.min)}` : iso
}

/** Sammensætter navne: "Anna", "Anna og Bo", "Anna, Bo og Carl" */
export function joinNames(names: string[]) {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} og ${names[names.length - 1]}`
}
