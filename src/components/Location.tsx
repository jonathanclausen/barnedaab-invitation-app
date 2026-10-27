/** Adresse som link til kort, og evt. parkeringsinfo */
export function Location({ address, parking }: { address: string; parking?: string }) {
  if (!address && !parking) return null
  return (
    <>
      {address && (
        <a className="map-link" href={`https://maps.google.com/?q=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">
          {address}
        </a>
      )}
      {parking && (
        <p className="location-parking">
          <strong>Parkering:</strong> {parking}
        </p>
      )}
    </>
  )
}
