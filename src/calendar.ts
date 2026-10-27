import type { EventSettings } from './types'

const pad = (n: number) => String(n).padStart(2, '0')

/** "2026-12-13" + "10:30" → "20261213T103000" (lokal tid) */
function stamp(date: string, time: string) {
  return `${date.replaceAll('-', '')}T${time.replace(':', '')}00`
}

function addHours(date: string, time: string, hours: number) {
  const d = new Date(`${date}T${time}:00`)
  d.setHours(d.getHours() + hours)
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
}

function nextDay(date: string) {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

function range(e: EventSettings) {
  if (!e.churchTime) return { allDay: true, start: e.date.replaceAll('-', ''), end: nextDay(e.date) }
  const end = e.endTime && e.endTime > e.churchTime ? stamp(e.date, e.endTime) : addHours(e.date, e.churchTime, 4)
  return { allDay: false, start: stamp(e.date, e.churchTime), end }
}

const location = (e: EventSettings) => [e.church, e.churchAddress].filter(Boolean).join(', ')

function description(e: EventSettings) {
  const lines = []
  if (e.reception || e.receptionAddress) {
    lines.push(`Bagefter${e.receptionTime ? ` kl. ${e.receptionTime}` : ''}: ${[e.reception, e.receptionAddress].filter(Boolean).join(', ')}`)
  }
  lines.push(window.location.href.split('?')[0])
  return lines.join('\n')
}

export function googleCalendarUrl(e: EventSettings) {
  const { start, end } = range(e)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.siteTitle || e.title,
    dates: `${start}/${end}`,
    ctz: 'Europe/Copenhagen',
    location: location(e),
    details: description(e),
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

const escape = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')

/** .ics-fil til Apple Kalender, Outlook m.fl. */
export function downloadIcs(e: EventSettings) {
  const { allDay, start, end } = range(e)
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const when = allDay
    ? [`DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${end}`]
    : [`DTSTART;TZID=Europe/Copenhagen:${start}`, `DTEND;TZID=Europe/Copenhagen:${end}`]
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//barnedaab-invitation//DA',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${start}-${Math.random().toString(36).slice(2)}@barnedaab`,
    `DTSTAMP:${now}`,
    ...when,
    `SUMMARY:${escape(e.siteTitle || e.title)}`,
    `LOCATION:${escape(location(e))}`,
    `DESCRIPTION:${escape(description(e))}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escape(e.siteTitle || e.title)} i morgen`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'barnedaab.ics'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
