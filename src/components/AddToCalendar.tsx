import { useState } from 'react'
import { downloadIcs, googleCalendarUrl } from '../calendar'
import type { EventSettings } from '../types'

export function AddToCalendar({ event }: { event: EventSettings }) {
  const [open, setOpen] = useState(false)
  if (!event.date) return null

  return (
    <div className="calendar">
      {open ? (
        <div className="row row--wrap calendar-options">
          <button className="btn btn--ghost btn--sm" onClick={() => downloadIcs(event)}>
            iPhone / Outlook
          </button>
          <a className="btn btn--ghost btn--sm" href={googleCalendarUrl(event)} target="_blank" rel="noreferrer">
            Google Kalender
          </a>
        </div>
      ) : (
        <button className="btn btn--ghost btn--sm" onClick={() => setOpen(true)}>
          Tilføj til kalender
        </button>
      )}
    </div>
  )
}
