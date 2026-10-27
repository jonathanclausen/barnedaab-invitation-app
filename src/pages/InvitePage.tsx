import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { ApiError, openInvite, recordLinkVisit, submitRsvp } from '../api'
import { formatDate, formatShortDate, joinNames } from '../format'
import type { Answer, EventSettings, GuestInvite } from '../types'
import { Ornament } from '../components/Ornament'
import { Envelope } from '../components/Envelope'
import { Location } from '../components/Location'
import { AddToHomeScreen } from '../components/AddToHomeScreen'
import { setManifestStart } from '../install'
import { useSite } from '../useSite'

const storageKey = (inviteId: string) => `invite-code-${inviteId}`

function readStoredCode(inviteId: string) {
  try {
    return localStorage.getItem(storageKey(inviteId)) ?? ''
  } catch {
    return ''
  }
}

function storeCode(inviteId: string, code: string) {
  try {
    localStorage.setItem(storageKey(inviteId), code)
  } catch {
    // privat browsing o.l. – gæsten må bare taste koden igen næste gang
  }
}

export default function InvitePage() {
  const { inviteId = '' } = useParams()
  const [params] = useSearchParams()
  const preview = params.get('preview') === '1'
  const theme = params.get('tema') === 'enhjoerning' ? 'unicorn' : 'space'
  const initialCode = params.get('code') ?? readStoredCode(inviteId)
  const site = useSite()

  const [code, setCode] = useState('')
  const [invite, setInvite] = useState<GuestInvite | null>(null)
  const [usedCode, setUsedCode] = useState('')
  const [event, setEvent] = useState<EventSettings | null>(null)
  const [opened, setOpened] = useState(false)
  const [checking, setChecking] = useState(!!initialCode)
  const [error, setError] = useState('')
  const tracked = useRef(false)

  async function unlock(candidate: string, silent = false) {
    if (!candidate.trim()) return
    setChecking(true)
    setError('')
    try {
      const found = await openInvite(inviteId, candidate.trim(), preview)
      if (!found) {
        if (!silent) setError('Koden passer ikke til dette link. Prøv igen.')
        return
      }
      if (!preview) storeCode(inviteId, candidate.trim())
      setUsedCode(candidate.trim())
      if (!preview) {
        // Ikonet på hjemmeskærmen skal åbne invitationen direkte (iPhone deler ikke koden med Safari)
        setManifestStart(`/i/${inviteId}?code=${encodeURIComponent(candidate.trim())}`)
        if (params.has('code')) window.history.replaceState(null, '', `/i/${inviteId}`)
      }
      setEvent(found.event)
      setInvite(found.invite)
    } catch (e) {
      if (!silent)
        setError(
          e instanceof ApiError && e.status === 429
            ? 'For mange forkerte forsøg. Vent et kvarter, og prøv igen.'
            : 'Noget gik galt. Tjek din internetforbindelse og prøv igen.',
        )
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    if (!preview) recordLinkVisit(inviteId).catch(() => {})
    if (initialCode) unlock(initialCode, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteId])

  if (invite && event && opened) {
    return <Invitation invite={invite} code={usedCode} event={event} preview={preview} />
  }

  const ready = !!(invite && event)

  return (
    <main className="page page--center envelope-page">
      <Envelope
        addressee={invite ? invite.label || joinNames(invite.guests.map((g) => g.name)) : undefined}
        title={site.siteTitle}
        monogram={site.monogram}
        open={ready}
        onOpened={() => setOpened(true)}
        theme={theme}
        letter={
          <>
            <p className="eyebrow">Du er inviteret</p>
            <p className="letter-title">{event?.title ?? site.siteTitle}</p>
            {event?.date && <p className="letter-date">{formatDate(event.date)}</p>}
          </>
        }
      />
      <div className={`unlock ${ready || checking ? 'is-hidden' : ''}`}>
        <p className="muted">Tast koden, du har fået sammen med linket, for at åbne din invitation.</p>
        <form
          className="code-form"
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            unlock(code)
          }}
        >
          <input
            className="code-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            placeholder="••••"
            aria-label="Kode"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
          />
          <button className="btn btn--primary" disabled={checking || !code}>
            {checking ? 'Åbner…' : 'Åbn invitation'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    </main>
  )
}

function Invitation({
  invite: initial,
  code,
  event,
  preview,
}: {
  invite: GuestInvite
  code: string
  event: EventSettings
  preview: boolean
}) {
  const [invite, setInvite] = useState(initial)
  const [answers, setAnswers] = useState<Record<string, Answer>>(initial.rsvp)
  const [note, setNote] = useState(initial.note)
  const [editing, setEditing] = useState(!initial.respondedAt)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [justSent, setJustSent] = useState(false)

  const plural = invite.guests.length > 1
  const allAnswered = invite.guests.every((g) => answers[g.id])
  const names = joinNames(invite.guests.map((g) => g.name))

  async function send(e: FormEvent) {
    e.preventDefault()
    if (!allAnswered) {
      setError(plural ? 'Svar venligst for alle personer.' : 'Vælg venligst om du kommer.')
      return
    }
    if (preview) {
      setError('Dette er en forhåndsvisning – svaret er ikke gemt.')
      return
    }
    setSaving(true)
    setError('')
    try {
      setInvite(await submitRsvp(invite.id, code, answers, note.trim()))
      setEditing(false)
      setJustSent(true)
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 429
          ? 'Der er sendt mange svar på kort tid. Prøv igen om lidt.'
          : 'Svaret kunne ikke gemmes. Prøv igen om lidt.',
      )
    } finally {
      setSaving(false)
    }
  }

  const coming = invite.guests.filter((g) => invite.rsvp[g.id] === 'yes')
  const notComing = invite.guests.filter((g) => invite.rsvp[g.id] === 'no')

  return (
    <main className="page">
      {preview && <div className="preview-banner">Forhåndsvisning – åbninger tælles ikke, og svar gemmes ikke</div>}

      <section className="card hero fade-in">
        <Ornament />
        <p className="eyebrow">Kære {invite.label || names}</p>
        <h1 className="display">{event.title}</h1>
        {event.date && <p className="hero-date">{formatDate(event.date)}</p>}
        <p className="lead">{event.intro}</p>
        {invite.greeting && <p className="greeting">{invite.greeting}</p>}
      </section>

      <section className="card details fade-in">
        <div className="detail">
          <h2>Dåben</h2>
          {event.churchTime && <p className="detail-time">Kl. {event.churchTime}</p>}
          {event.church && <p className="detail-place">{event.church}</p>}
          <Location address={event.churchAddress} parking={event.churchParking} />
          {!event.church && !event.churchTime && <p className="muted">Detaljer følger</p>}
        </div>
        {(event.reception || event.receptionAddress) && (
          <div className="detail">
            <h2>Bagefter</h2>
            {event.receptionTime && <p className="detail-time">Kl. {event.receptionTime}</p>}
            {event.reception && <p className="detail-place">{event.reception}</p>}
            <Location address={event.receptionAddress} parking={event.receptionParking} />
          </div>
        )}
        {event.practical && (
          <div className="detail detail--wide">
            <h2>Praktisk</h2>
            <p className="prewrap">{event.practical}</p>
          </div>
        )}
        {/^https?:\/\//i.test(event.wishlistUrl) && (
          <div className="detail detail--wide wishlist">
            <h2>Ønsker</h2>
            {event.wishlistText && <p className="prewrap">{event.wishlistText}</p>}
            <a className="btn btn--ghost" href={event.wishlistUrl} target="_blank" rel="noreferrer">
              Se ønskelisten
            </a>
          </div>
        )}
      </section>

      <section className="card rsvp fade-in">
        {editing ? (
          <form onSubmit={send}>
            <h2 className="section-title">{plural ? 'Kommer I?' : 'Kommer du?'}</h2>
            {event.rsvpBy && <p className="muted center">Svar gerne senest {formatShortDate(event.rsvpBy)}</p>}
            <ul className="guest-list">
              {invite.guests.map((g) => (
                <li key={g.id} className="guest-row">
                  <span className="guest-name">{g.name}</span>
                  <div className="choice" role="radiogroup" aria-label={`Svar for ${g.name}`}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={answers[g.id] === 'yes'}
                      className={`choice-btn ${answers[g.id] === 'yes' ? 'is-yes' : ''}`}
                      onClick={() => setAnswers({ ...answers, [g.id]: 'yes' })}
                    >
                      Deltager
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={answers[g.id] === 'no'}
                      className={`choice-btn ${answers[g.id] === 'no' ? 'is-no' : ''}`}
                      onClick={() => setAnswers({ ...answers, [g.id]: 'no' })}
                    >
                      Deltager ikke
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <label className="field">
              <span>Note til os (valgfri)</span>
              <textarea
                rows={3}
                maxLength={2000}
                placeholder="F.eks. allergier, en hilsen eller andet vi skal vide"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="btn btn--primary btn--block" disabled={saving}>
              {saving ? 'Sender…' : 'Send svar'}
            </button>
          </form>
        ) : (
          <div className="answered">
            <h2 className="section-title">{justSent ? 'Tak for svaret!' : plural ? 'Jeres svar' : 'Dit svar'}</h2>
            {coming.length > 0 && (
              <p>
                <strong>{joinNames(coming.map((g) => g.name))}</strong> deltager.
                {justSent && (plural ? ' Vi glæder os til at se jer!' : ' Vi glæder os til at se dig!')}
              </p>
            )}
            {notComing.length > 0 && (
              <p>
                <strong>{joinNames(notComing.map((g) => g.name))}</strong> deltager ikke.
              </p>
            )}
            {invite.note && <p className="note-echo">“{invite.note}”</p>}
            <button className="btn btn--ghost" onClick={() => setEditing(true)}>
              Ret svar
            </button>
          </div>
        )}
      </section>

      {!preview && <AddToHomeScreen />}

      {event.signature && (
        <p className="signature">
          {event.signature}
        </p>
      )}
    </main>
  )
}
