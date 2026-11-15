// Dato- og tidsfelter der altid vises på dansk og med 24-timers ur.
// Browserens egne <input type="date|time"> følger enhedens sprog (fx AM/PM og
// mm/dd/åååå på en engelsk-indstillet Mac), så vi bruger vores egne valgbokse.
// Værdierne gemmes stadig som "2027-03-14" og "14:30".

const MONTHS = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december']
const pad = (n: number) => String(n).padStart(2, '0')

type Props = { value: string; onChange: (value: string) => void; label: string }

export function DanishDateInput({ value, onChange, label }: Props) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  const y = m ? Number(m[1]) : 0
  const mo = m ? Number(m[2]) : 0
  const d = m ? Number(m[3]) : 0
  const thisYear = new Date().getFullYear()
  const years = [thisYear, thisYear + 1, thisYear + 2]
  if (y && !years.includes(y)) years.unshift(y)
  const daysIn = (yy: number, mm: number) => (yy && mm ? new Date(Date.UTC(yy, mm, 0)).getUTCDate() : 31)

  function update(next: { y?: number; mo?: number; d?: number }) {
    const ny = next.y ?? y
    const nmo = next.mo ?? mo
    let nd = next.d ?? d
    if (!ny && !nmo && !nd) return onChange('')
    // Udfyld manglende dele med fornuftige standarder, så værdien altid er gyldig
    const yy = ny || thisYear
    const mm = nmo || 1
    nd = Math.min(nd || 1, daysIn(yy, mm))
    onChange(`${yy}-${pad(mm)}-${pad(nd)}`)
  }

  return (
    <div className="dk-input" role="group" aria-label={label}>
      <select aria-label={`${label}: dag`} value={d || ''} onChange={(e) => update({ d: Number(e.target.value) })}>
        <option value="">Dag</option>
        {Array.from({ length: daysIn(y, mo) }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}.</option>)}
      </select>
      <select aria-label={`${label}: måned`} value={mo || ''} onChange={(e) => update({ mo: Number(e.target.value) })}>
        <option value="">Måned</option>
        {MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
      </select>
      <select aria-label={`${label}: år`} value={y || ''} onChange={(e) => update({ y: Number(e.target.value) })}>
        <option value="">År</option>
        {years.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      {value && <button type="button" className="dk-clear" aria-label={`Ryd ${label.toLowerCase()}`} onClick={() => onChange('')}>×</button>}
    </div>
  )
}

export function DanishTimeInput({ value, onChange, label }: Props) {
  const m = /^(\d{1,2})[:.](\d{2})/.exec(value || '')
  const h = m ? pad(Number(m[1])) : ''
  const min = m ? m[2] : ''
  const minutes = Array.from({ length: 12 }, (_, i) => pad(i * 5))
  if (min && !minutes.includes(min)) minutes.push(min)
  minutes.sort()

  const update = (nh: string, nmin: string) => onChange(nh || nmin ? `${nh || '12'}:${nmin || '00'}` : '')

  return (
    <div className="dk-input" role="group" aria-label={label}>
      <span className="dk-prefix">kl.</span>
      <select aria-label={`${label}: time`} value={h} onChange={(e) => update(e.target.value, min)}>
        <option value="">--</option>
        {Array.from({ length: 24 }, (_, i) => pad(i)).map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <span className="dk-sep">:</span>
      <select aria-label={`${label}: minutter`} value={min} onChange={(e) => update(h, e.target.value)}>
        <option value="">--</option>
        {minutes.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      {value && <button type="button" className="dk-clear" aria-label={`Ryd ${label.toLowerCase()}`} onClick={() => onChange('')}>×</button>}
    </div>
  )
}
