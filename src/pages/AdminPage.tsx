import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  adminMe,
  ApiError,
  createInvite,
  deleteInvite,
  fetchEvent,
  inviteUrl,
  listInvites,
  login,
  logout,
  newGuestId,
  resetOpens,
  saveEvent,
  updateInvite,
} from '../api'
import { formatTimestamp } from '../format'
import { useSite } from '../useSite'
import { defaultEvent, type EventSettings, type Guest, type Invite } from '../types'

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    adminMe()
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false))
  }, [])

  if (authed === undefined) return <main className="page page--center"><p className="muted center">Indlæser…</p></main>
  if (!authed) return <Login onLogin={() => setAuthed(true)} />
  return <Dashboard onLogout={() => setAuthed(false)} />
}

function Login({ onLogin }: { onLogin: () => void }) {
  const { siteTitle } = useSite()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(password)
      onLogin()
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === 'no-password-configured'
          ? 'Der er ikke sat et admin-kodeord (ADMIN_PASSWORD) i Cloudflare endnu.'
          : 'Forkert kodeord.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page page--center">
      <section className="card card--narrow">
        <p className="eyebrow">Admin</p>
        <h1 className="display">{siteTitle}</h1>
        <form className="code-form" onSubmit={submit}>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Kodeord"
            aria-label="Kodeord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button className="btn btn--primary" disabled={busy || !password}>
            {busy ? 'Logger ind…' : 'Log ind'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>
    </main>
  )
}

type Filter = 'all' | 'unanswered' | 'unopened' | 'answered'

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const { siteTitle } = useSite()
  const [invites, setInvites] = useState<Invite[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [tab, setTab] = useState<'invites' | 'event'>('invites')
  const [filter, setFilter] = useState<Filter>('all')

  const reload = useCallback(async () => {
    try {
      setInvites(await listInvites())
      setLoadError(false)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onLogout()
      else setLoadError(true)
    }
  }, [onLogout])

  useEffect(() => {
    reload()
    // Hent nye svar og åbninger løbende, og når fanen får fokus igen
    const timer = setInterval(reload, 30_000)
    window.addEventListener('focus', reload)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', reload)
    }
  }, [reload])

  const stats = useMemo(() => {
    const all = invites ?? []
    const guests = all.flatMap((i) => i.guests.map((g) => i.rsvp[g.id]))
    return {
      invites: all.length,
      opened: all.filter((i) => i.openCount > 0).length,
      guests: guests.length,
      yes: guests.filter((a) => a === 'yes').length,
      no: guests.filter((a) => a === 'no').length,
      pending: guests.filter((a) => !a).length,
    }
  }, [invites])

  const visible = (invites ?? []).filter((i) => {
    if (filter === 'unanswered') return !i.respondedAt
    if (filter === 'answered') return !!i.respondedAt
    if (filter === 'unopened') return i.openCount === 0
    return true
  })

  return (
    <main className="admin">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="display display--sm">{siteTitle}</h1>
        </div>
        <button className="btn btn--ghost btn--sm" onClick={() => logout().finally(onLogout)}>
          Log ud
        </button>
      </header>

      <nav className="tabs">
        <button className={tab === 'invites' ? 'is-active' : ''} onClick={() => setTab('invites')}>
          Invitationer
        </button>
        <button className={tab === 'event' ? 'is-active' : ''} onClick={() => setTab('event')}>
          Dagens detaljer
        </button>
      </nav>

      {tab === 'event' ? (
        <EventForm />
      ) : (
        <>
          <section className="stats">
            <Stat label="Deltager" value={stats.yes} tone="yes" />
            <Stat label="Deltager ikke" value={stats.no} tone="no" />
            <Stat label="Mangler svar" value={stats.pending} sub={`af ${stats.guests} personer`} />
            <Stat label="Åbnet" value={stats.opened} sub={`af ${stats.invites} invitationer`} />
          </section>

          <NewInviteForm onCreated={reload} />

          <div className="filters">
            {(
              [
                ['all', 'Alle'],
                ['unopened', 'Ikke åbnet'],
                ['unanswered', 'Ikke svaret'],
                ['answered', 'Har svaret'],
              ] as const
            ).map(([key, label]) => (
              <button key={key} className={`chip ${filter === key ? 'is-active' : ''}`} onClick={() => setFilter(key)}>
                {label}
              </button>
            ))}
          </div>

          {loadError && <p className="error">Kunne ikke hente invitationer. Prøver igen om lidt.</p>}
          {invites === null ? (
            <p className="muted">Indlæser invitationer…</p>
          ) : visible.length === 0 ? (
            <p className="muted">Ingen invitationer her endnu.</p>
          ) : (
            <ul className="invite-list">
              {visible.map((i) => (
                <InviteCard key={i.id} invite={i} siteTitle={siteTitle} onChanged={reload} />
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: number; sub?: string; tone?: 'yes' | 'no' }) {
  return (
    <div className={`stat ${tone ? `stat--${tone}` : ''}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  )
}

function splitNames(text: string) {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function NewInviteForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [names, setNames] = useState('')
  const [greeting, setGreeting] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const list = splitNames(names)
    if (list.length === 0) {
      setError('Skriv mindst ét navn.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await createInvite(label.trim(), greeting.trim(), list)
      onCreated()
      setLabel('')
      setNames('')
      setGreeting('')
      setOpen(false)
    } catch {
      setError('Kunne ikke oprette invitationen.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button className="btn btn--primary new-invite-btn" onClick={() => setOpen(true)}>
        + Ny invitation
      </button>
    )
  }

  return (
    <form className="card panel" onSubmit={submit}>
      <h2 className="panel-title">Ny invitation</h2>
      <label className="field">
        <span>Personer (ét navn pr. linje eller adskilt af komma)</span>
        <textarea rows={3} value={names} onChange={(e) => setNames(e.target.value)} placeholder={'Mormor Lis\nMorfar Henrik'} autoFocus />
      </label>
      <label className="field">
        <span>Tiltale (valgfri – ellers bruges navnene)</span>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Mormor og Morfar" />
      </label>
      <label className="field">
        <span>Personlig hilsen (valgfri)</span>
        <textarea rows={2} value={greeting} onChange={(e) => setGreeting(e.target.value)} placeholder="Vi glæder os helt vildt til at se jer!" />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="btn btn--primary" disabled={saving}>
          {saving ? 'Opretter…' : 'Opret invitation'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>
          Annullér
        </button>
      </div>
    </form>
  )
}

function shareMessage(invite: Invite, siteTitle: string) {
  const greetingName = invite.label || invite.guests.map((g) => g.name).join(' og ')
  const plural = invite.guests.length > 1
  return `Hej ${greetingName}! ${plural ? 'I' : 'Du'} er inviteret: ${siteTitle} 🤍\n\nÅbn ${plural ? 'jeres' : 'din'} invitation her og svar, om ${plural ? 'I' : 'du'} kan komme:\n${inviteUrl(invite.id)}\n\nKode: ${invite.code}`
}

function useCopy() {
  const [copied, setCopied] = useState('')
  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      window.prompt('Kopiér teksten:', text)
    }
    setCopied(what)
    setTimeout(() => setCopied(''), 1800)
  }
  return { copied, copy }
}

function InviteCard({ invite, siteTitle, onChanged }: { invite: Invite; siteTitle: string; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const { copied, copy } = useCopy()
  const title = invite.label || invite.guests.map((g) => g.name).join(' og ')

  if (editing)
    return (
      <EditInvite
        invite={invite}
        onDone={() => {
          setEditing(false)
          onChanged()
        }}
      />
    )

  return (
    <li className="card invite-card">
      <div className="invite-top">
        <div>
          <h3 className="invite-title">{title}</h3>
          <p className="muted small">
            Kode <strong className="mono">{invite.code}</strong>
            {invite.respondedAt && <> · svarede {formatTimestamp(invite.respondedAt)}</>}
          </p>
        </div>
        <OpenBadge invite={invite} />
      </div>

      <ul className="status-list">
        {invite.guests.map((g) => {
          const a = invite.rsvp[g.id]
          return (
            <li key={g.id} className={`status status--${a ?? 'pending'}`}>
              <span className="status-dot" aria-hidden="true" />
              {g.name}
              <span className="status-text">{a === 'yes' ? 'Deltager' : a === 'no' ? 'Deltager ikke' : 'Intet svar'}</span>
            </li>
          )
        })}
      </ul>

      {invite.note && <p className="note-echo">“{invite.note}”</p>}

      <div className="row row--wrap">
        <button className="btn btn--primary btn--sm" onClick={() => copy(shareMessage(invite, siteTitle), 'msg')}>
          {copied === 'msg' ? 'Kopieret ✓' : 'Kopiér besked'}
        </button>
        <button className="btn btn--ghost btn--sm" onClick={() => copy(inviteUrl(invite.id), 'link')}>
          {copied === 'link' ? 'Kopieret ✓' : 'Kopiér link'}
        </button>
        <a
          className="btn btn--ghost btn--sm"
          href={`/i/${invite.id}?preview=1&code=${invite.code}`}
          target="_blank"
          rel="noreferrer"
        >
          Forhåndsvis
        </a>
        <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>
          Redigér
        </button>
      </div>
    </li>
  )
}

function OpenBadge({ invite }: { invite: Invite }) {
  if (invite.openCount > 0) {
    return (
      <div className="open-badge is-opened" title={`Første gang: ${formatTimestamp(invite.firstOpenedAt)}`}>
        <strong>Åbnet {invite.openCount}×</strong>
        <span>senest {formatTimestamp(invite.lastOpenedAt)}</span>
      </div>
    )
  }
  if (invite.linkVisits > 0) {
    return (
      <div className="open-badge is-visited" title={`Senest ${formatTimestamp(invite.lastVisitAt)}`}>
        <strong>Link besøgt {invite.linkVisits}×</strong>
        <span>men koden er ikke tastet</span>
      </div>
    )
  }
  return (
    <div className="open-badge">
      <strong>Ikke åbnet</strong>
    </div>
  )
}

function EditInvite({ invite, onDone }: { invite: Invite; onDone: () => void }) {
  const [label, setLabel] = useState(invite.label)
  const [greeting, setGreeting] = useState(invite.greeting)
  const [guests, setGuests] = useState<Guest[]>(invite.guests)
  const [saving, setSaving] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    const cleaned = guests.map((g) => ({ ...g, name: g.name.trim() })).filter((g) => g.name)
    if (cleaned.length === 0) return
    setSaving(true)
    try {
      await updateInvite(invite.id, label.trim(), greeting.trim(), cleaned)
      onDone()
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!window.confirm(`Slet invitationen til ${invite.label || guests.map((g) => g.name).join(', ')}? Linket holder op med at virke.`)) return
    await deleteInvite(invite.id)
    onDone()
  }

  async function reset() {
    if (!window.confirm('Nulstil antal åbninger? (f.eks. hvis I selv har testet linket)')) return
    await resetOpens(invite.id)
    onDone()
  }

  return (
    <li className="card invite-card">
      <form onSubmit={save}>
        <h3 className="panel-title">Redigér invitation</h3>
        <div className="field">
          <span>Personer</span>
          {guests.map((g, idx) => (
            <div className="row" key={g.id}>
              <input
                value={g.name}
                onChange={(e) => setGuests(guests.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))}
              />
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                aria-label={`Fjern ${g.name}`}
                onClick={() => setGuests(guests.filter((_, i) => i !== idx))}
              >
                Fjern
              </button>
            </div>
          ))}
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setGuests([...guests, { id: newGuestId(), name: '' }])}>
            + Tilføj person
          </button>
        </div>
        <label className="field">
          <span>Tiltale</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <label className="field">
          <span>Personlig hilsen</span>
          <textarea rows={2} value={greeting} onChange={(e) => setGreeting(e.target.value)} />
        </label>
        <div className="row row--wrap">
          <button className="btn btn--primary btn--sm" disabled={saving}>
            Gem
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onDone}>
            Annullér
          </button>
          <span className="spacer" />
          <button type="button" className="btn btn--ghost btn--sm" onClick={reset}>
            Nulstil åbninger
          </button>
          <button type="button" className="btn btn--danger btn--sm" onClick={remove}>
            Slet
          </button>
        </div>
      </form>
    </li>
  )
}

function EventForm() {
  const [event, setEvent] = useState<EventSettings>(defaultEvent)
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    fetchEvent().then((e) => {
      setEvent(e)
      setLoaded(true)
    })
  }, [])

  const set = (key: keyof EventSettings) => (e: { target: { value: string } }) =>
    setEvent({ ...event, [key]: e.target.value })

  async function save(e: FormEvent) {
    e.preventDefault()
    setStatus('Gemmer…')
    try {
      await saveEvent(event)
      setStatus('Gemt ✓')
    } catch {
      setStatus('Kunne ikke gemme')
    }
    setTimeout(() => setStatus(''), 2000)
  }

  return (
    <form className="card panel" onSubmit={save}>
      <h2 className="panel-title">Det står på alle invitationer</h2>
      <div className="grid-2">
        <label className="field">
          <span>Sidens navn (vises før koden er tastet)</span>
          <input value={event.siteTitle} onChange={set('siteTitle')} placeholder="Emmas barnedåb" />
        </label>
        <label className="field">
          <span>Bogstav i voksseglet</span>
          <input value={event.monogram} maxLength={2} onChange={set('monogram')} placeholder="E" />
        </label>
      </div>
      <label className="field">
        <span>Overskrift</span>
        <input value={event.title} onChange={set('title')} />
      </label>
      <label className="field">
        <span>Indledning</span>
        <textarea rows={3} value={event.intro} onChange={set('intro')} />
      </label>
      <div className="grid-2">
        <label className="field">
          <span>Dato</span>
          <input type="date" value={event.date} onChange={set('date')} />
        </label>
        <label className="field">
          <span>Svar senest</span>
          <input type="date" value={event.rsvpBy} onChange={set('rsvpBy')} />
        </label>
      </div>
      <h3 className="subhead">Dåben</h3>
      <div className="grid-2">
        <label className="field">
          <span>Kirke</span>
          <input value={event.church} onChange={set('church')} placeholder="Vor Frue Kirke" />
        </label>
        <label className="field">
          <span>Klokken</span>
          <input type="time" value={event.churchTime} onChange={set('churchTime')} />
        </label>
      </div>
      <label className="field">
        <span>Adresse</span>
        <input value={event.churchAddress} onChange={set('churchAddress')} placeholder="Vej 1, 1234 By" />
      </label>
      <label className="field">
        <span>Parkering (valgfri)</span>
        <input value={event.churchParking} onChange={set('churchParking')} placeholder="Gratis parkering bag kirken" />
      </label>
      <h3 className="subhead">Bagefter</h3>
      <div className="grid-2">
        <label className="field">
          <span>Sted</span>
          <input value={event.reception} onChange={set('reception')} placeholder="Hjemme hos os" />
        </label>
        <label className="field">
          <span>Klokken</span>
          <input type="time" value={event.receptionTime} onChange={set('receptionTime')} />
        </label>
      </div>
      <label className="field">
        <span>Adresse</span>
        <input value={event.receptionAddress} onChange={set('receptionAddress')} placeholder="Vej 2, 1234 By" />
      </label>
      <label className="field">
        <span>Parkering (valgfri)</span>
        <input value={event.receptionParking} onChange={set('receptionParking')} placeholder="Der kan parkeres på vejen" />
      </label>

      <label className="field">
        <span>Praktisk info (valgfri)</span>
        <textarea rows={3} value={event.practical} onChange={set('practical')} placeholder="Parkering, gaveønsker, påklædning …" />
      </label>
      <h3 className="subhead">Ønskeliste</h3>
      <label className="field">
        <span>Link (f.eks. fra Ønskeskyen)</span>
        <input type="url" value={event.wishlistUrl} onChange={set('wishlistUrl')} placeholder="https://onskeskyen.dk/..." />
      </label>
      <label className="field">
        <span>Tekst over knappen (valgfri)</span>
        <input value={event.wishlistText} onChange={set('wishlistText')} placeholder="Har I lyst til at give en gave, har vi samlet nogle idéer her." />
      </label>
      <label className="field">
        <span>Underskrift</span>
        <input value={event.signature} onChange={set('signature')} placeholder="Kærlig hilsen …" />
      </label>
      <div className="row">
        <button className="btn btn--primary" disabled={!loaded}>Gem</button>
        {status && <span className="muted">{status}</span>}
      </div>
    </form>
  )
}
