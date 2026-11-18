/** inverted : version claire, pour fond sombre (menu latéral). */
export function Logo({ className = "", inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" className="shrink-0">
        <defs>
          <linearGradient id="logo-tile" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="var(--btn-from)" />
            <stop offset="1" stopColor="var(--btn-to)" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#logo-tile)" />
        <path
          d="M10 21.5 16 10l6 11.5M10 21.5h12"
          fill="none"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinejoin="round"
          opacity="0.5"
        />
        <circle cx="16" cy="10" r="2.6" fill="#fff" />
        <circle cx="10" cy="21.5" r="2.6" fill="var(--violet)" stroke="#fff" strokeWidth="1" />
        <circle cx="22" cy="21.5" r="2.6" fill="var(--cyan)" stroke="#fff" strokeWidth="1" />
      </svg>
      <span className={`text-[1.05rem] font-semibold tracking-[-0.02em] ${inverted ? "text-panel-ink" : "text-ink"}`}>
        GAMA-<span className={inverted ? "text-sim-s" : "text-accent"}>Copilot</span>
      </span>
    </span>
  );
}
