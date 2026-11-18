// The PostPock mark: a pocket keeping a crescent moon.
export function LogoMark({ size = 28, className }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden="true">
      <path d="M22.6 2.6a6.4 6.4 0 1 0 5.2 10.2 5.2 5.2 0 1 1-5.2-10.2Z" fill="var(--logo-moon, #e9c460)" />
      <path d="M4.5 11.2h21.4v8.4a10.7 10.7 0 0 1-21.4 0Z" fill="var(--logo-pocket, currentColor)" />
      <path d="M7.4 14.4h15.6" stroke="var(--logo-stitch, rgba(255,255,255,.55))" strokeWidth="1.1" strokeLinecap="round" strokeDasharray="1.4 2" />
    </svg>
  );
}

export function Logo({ size = 26, className, wordmark = true }) {
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.36) }}>
      <LogoMark size={size} />
      {wordmark && (
        <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 720, fontSize: Math.round(size * 0.68), letterSpacing: '-0.025em', lineHeight: 1 }}>
          PostPock
        </span>
      )}
    </span>
  );
}
