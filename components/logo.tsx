export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" className="shrink-0">
        <rect width="32" height="32" rx="9" fill="var(--accent-strong)" />
        <path
          d="M10 21.5 16 10l6 11.5M10 21.5h12"
          fill="none"
          stroke="var(--accent-ink)"
          strokeWidth="1.6"
          strokeLinejoin="round"
          opacity="0.55"
        />
        <circle cx="16" cy="10" r="2.6" fill="var(--accent-ink)" />
        <circle cx="10" cy="21.5" r="2.6" fill="var(--accent-ink)" />
        <circle cx="22" cy="21.5" r="2.6" fill="var(--warm)" />
      </svg>
      <span className="text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">
        GAMA<span className="text-muted">-</span>Copilot
      </span>
    </span>
  );
}
