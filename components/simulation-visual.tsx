/**
 * Illustration : une vue de simulation multi-agents (modèle épidémique type SIR)
 * accompagnée du fragment GAML qui la décrit. Les groupes d'agents dérivent
 * lentement ; l'animation est coupée si l'utilisateur préfère moins de mouvement.
 */

type Agent = { x: number; y: number; infected?: boolean };
type Cluster = { drift: 1 | 2 | 3; agents: Agent[]; links: [number, number][] };

const clusters: Cluster[] = [
  {
    drift: 1,
    agents: [
      { x: 92, y: 96 },
      { x: 138, y: 72 },
      { x: 150, y: 128, infected: true },
      { x: 104, y: 150 },
    ],
    links: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]],
  },
  {
    drift: 2,
    agents: [
      { x: 300, y: 64 },
      { x: 352, y: 92 },
      { x: 322, y: 136 },
    ],
    links: [[0, 1], [1, 2], [2, 0]],
  },
  {
    drift: 3,
    agents: [
      { x: 236, y: 212, infected: true },
      { x: 286, y: 248, infected: true },
      { x: 226, y: 270 },
      { x: 334, y: 214 },
      { x: 186, y: 236 },
    ],
    links: [[0, 1], [1, 2], [0, 2], [1, 3], [0, 4], [4, 2]],
  },
];

const loners: (Agent & { drift: 1 | 2 | 3 })[] = [
  { x: 60, y: 236, drift: 2 },
  { x: 404, y: 168, drift: 1 },
  { x: 436, y: 226, drift: 3, infected: true },
  { x: 200, y: 48, drift: 3 },
  { x: 120, y: 296, drift: 1 },
];

export function SimulationVisual() {
  return (
    <figure className="relative">
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_40px_-24px_var(--shadow)]">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-xs text-muted">
          <span className="font-mono">epidemie.gaml</span>
          <span className="flex items-center gap-3 font-mono tabular-nums">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-accent" /> sains 13
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-warm" /> infectés 4
            </span>
          </span>
        </div>
        <svg viewBox="0 0 460 330" className="block h-auto w-full" role="img" aria-label="Aperçu d'une simulation multi-agents : des agents sains et infectés reliés par leurs contacts sur une grille">
          <defs>
            <pattern id="sim-grid" width="23" height="23" patternUnits="userSpaceOnUse">
              <path d="M23 0H0V23" fill="none" stroke="var(--line)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="460" height="330" fill="url(#sim-grid)" />
          <rect x="207" y="184" width="161" height="115" fill="var(--warm)" opacity="0.07" />
          <rect x="69" y="46" width="115" height="115" fill="var(--accent)" opacity="0.06" />

          {clusters.map((c, ci) => (
            <g key={ci} className={`sim-drift-${c.drift}`}>
              {c.links.map(([a, b]) => (
                <line
                  key={`${a}-${b}`}
                  x1={c.agents[a].x}
                  y1={c.agents[a].y}
                  x2={c.agents[b].x}
                  y2={c.agents[b].y}
                  stroke={c.agents[a].infected || c.agents[b].infected ? "var(--warm)" : "var(--accent)"}
                  strokeOpacity="0.38"
                  strokeWidth="1.4"
                />
              ))}
              {c.agents.map((a, ai) => (
                <AgentDot key={ai} {...a} />
              ))}
            </g>
          ))}
          {loners.map((a, i) => (
            <g key={i} className={`sim-drift-${a.drift}`}>
              <AgentDot {...a} />
            </g>
          ))}
        </svg>
      </div>

      <pre className="absolute -bottom-6 right-4 hidden max-w-[19rem] rounded-xl border border-line bg-canvas/95 px-4 py-3 font-mono text-[0.72rem] leading-relaxed text-muted shadow-[0_14px_30px_-18px_var(--shadow)] sm:block lg:-right-6">
        <code>
          <span className="text-accent">species</span> <span className="text-ink">people</span> skills: [moving] {"{"}
          {"\n  "}bool is_infected {"<-"} <span className="text-warm">false</span>;
          {"\n  "}<span className="text-accent">reflex</span> move {"{"} do wander; {"}"}
          {"\n"}{"}"}
        </code>
      </pre>
      <figcaption className="sr-only">
        Exemple de modèle GAML généré par GAMA-Copilot et sa simulation.
      </figcaption>
    </figure>
  );
}

function AgentDot({ x, y, infected }: Agent) {
  const color = infected ? "var(--warm)" : "var(--accent)";
  return (
    <g>
      <circle cx={x} cy={y} r="11" fill={color} opacity="0.14" />
      <circle cx={x} cy={y} r="5" fill={color} />
    </g>
  );
}
