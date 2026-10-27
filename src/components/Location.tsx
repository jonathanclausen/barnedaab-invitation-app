const isApple = () => /iPhone|iPad|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document

function directionsUrl(address: string) {
  const q = encodeURIComponent(address)
  return isApple() ? `https://maps.apple.com/?daddr=${q}` : `https://www.google.com/maps/dir/?api=1&destination=${q}`
}

/** Adresse med lille kort, knap til rutevejledning og evt. parkeringsinfo */
export function Location({ address, parking }: { address: string; parking?: string }) {
  if (!address) return null
  return (
    <div className="location">
      <p className="location-address">{address}</p>
      <iframe
        className="location-map"
        title={`Kort: ${address}`}
        src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <a className="btn btn--ghost btn--sm" href={directionsUrl(address)} target="_blank" rel="noreferrer">
        Vis rute
      </a>
      {parking && (
        <p className="location-parking">
          <strong>Parkering:</strong> {parking}
        </p>
      )}
    </div>
  )
}
