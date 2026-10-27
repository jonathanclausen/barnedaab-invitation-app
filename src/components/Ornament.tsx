export function Ornament() {
  return (
    <svg className="ornament" viewBox="0 0 160 32" aria-hidden="true">
      <path d="M8 16h52M100 16h52" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path
        d="M80 6c-4 5-9 7-9 12a9 9 0 0 0 18 0c0-5-5-7-9-12z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M62 16c4-5 8-5 10-2M98 16c-4-5-8-5-10-2" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <circle cx="60" cy="16" r="1.6" fill="currentColor" />
      <circle cx="100" cy="16" r="1.6" fill="currentColor" />
    </svg>
  )
}
