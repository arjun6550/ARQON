/** ARQON mark: an answer bubble, three quarters empty, one filled. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M16 16 L16 27 A11 11 0 0 0 27 16 Z" fill="var(--color-mark)" />
    </svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 font-bold tracking-wide">
      <LogoMark size={size} />
      <span style={{ fontSize: size * 0.7 }}>ARQON</span>
    </span>
  );
}
