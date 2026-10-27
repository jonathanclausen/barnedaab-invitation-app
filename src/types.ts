export type Answer = 'yes' | 'no'

export interface Guest {
  id: string
  name: string
}

/** Det gæsten ser */
export interface GuestInvite {
  id: string
  /** Hvordan gæsterne tiltales, f.eks. "Mormor og Morfar" */
  label: string
  /** Valgfri personlig hilsen, vises kun for denne invitation */
  greeting: string
  guests: Guest[]
  rsvp: Record<string, Answer>
  note: string
  respondedAt: string | null
}

/** Det admin ser */
export interface Invite extends GuestInvite {
  code: string
  openCount: number
  firstOpenedAt: string | null
  lastOpenedAt: string | null
  linkVisits: number
  lastVisitAt: string | null
  createdAt: string
}

export interface EventSettings {
  /** Navnet på siden, f.eks. "Emmas barnedåb" (vises før koden er tastet) */
  siteTitle: string
  /** Bogstav i voksseglet på kuverten */
  monogram: string
  title: string
  intro: string
  date: string
  churchTime: string
  church: string
  churchAddress: string
  churchParking: string
  reception: string
  receptionAddress: string
  receptionTime: string
  receptionParking: string
  rsvpBy: string
  practical: string
  /** Link til ønskeliste, f.eks. Ønskeskyen */
  wishlistUrl: string
  wishlistText: string
  signature: string
}

export interface SiteInfo {
  siteTitle: string
  monogram: string
}

export const defaultEvent: EventSettings = {
  siteTitle: 'Barnedåb',
  monogram: '',
  title: 'Du er inviteret til barnedåb',
  intro: 'Vi glæder os til at fejre dåben sammen med jer.',
  date: '',
  churchTime: '',
  church: '',
  churchAddress: '',
  churchParking: '',
  reception: '',
  receptionAddress: '',
  receptionTime: '',
  receptionParking: '',
  rsvpBy: '',
  practical: '',
  wishlistUrl: '',
  wishlistText: '',
  signature: 'Kærlig hilsen',
}
