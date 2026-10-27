export function formatDate(iso: string) {
  if (!iso) return ''
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  const s = d.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatShortDate(iso: string) {
  if (!iso) return ''
  const d = new Date(`${iso}T12:00:00`)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('da-DK', { day: 'numeric', month: 'long' })
}

export function formatTimestamp(iso: string | null | undefined) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** Sammensætter navne: "Anna", "Anna og Bo", "Anna, Bo og Carl" */
export function joinNames(names: string[]) {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} og ${names[names.length - 1]}`
}
