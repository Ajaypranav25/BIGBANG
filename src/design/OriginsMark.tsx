/** The Origins mark: a bright core inside a tilted orbit, with a small moon. Uses currentColor. */
export function OriginsMark({ size, className = '' }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" className={`origins-mark ${className}`.trim()}>
      <circle cx="32" cy="32" r="9" fill="currentColor" />
      <ellipse cx="32" cy="32" rx="27" ry="11" transform="rotate(-24 32 32)" stroke="currentColor" strokeOpacity=".55" strokeWidth="2" />
      <circle cx="56" cy="22" r="3" fill="currentColor" fillOpacity=".8" />
    </svg>
  )
}
