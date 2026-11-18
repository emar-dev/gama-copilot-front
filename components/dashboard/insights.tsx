"use client";

import { useState, type ReactNode } from "react";
import type { GamlSummary } from "@/lib/api";
import { ChartIcon, LayersIcon, PieIcon } from "../icons";

const SERIES = 6;

/** Couleur d'une espèce : ordre fixe du modèle, jamais recyclé ; au-delà de 6, « Autres ». */
export function seriesColor(index: number): string {
  return index < SERIES ? `var(--series-${index + 1})` : "var(--series-other)";
}

export function Card({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_var(--shadow)] ${className}`}>
      <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold text-ink">
        <span className="text-[1.1rem] text-accent">{icon}</span>
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ModelIndicators({ summary }: { summary: GamlSummary | null }) {
  const species = summary?.species ?? [];
  const known = species.filter((s) => s.initialCount !== null);
  const totalAgents = known.reduce((sum, s) => sum + (s.initialCount ?? 0), 0);
  const tiles = [
    { label: "Espèces", value: summary ? String(species.length) : "—" },
    {
      label: "Agents au départ",
      value: summary && known.length ? totalAgents.toLocaleString("fr-FR") : "—",
      note: summary && known.length < species.length ? "effectifs partiels" : undefined,
    },
    { label: "Réflexes", value: summary ? String(species.reduce((n, s) => n + s.reflexes.length, 0)) : "—" },
    { label: "Expériences", value: summary ? String(summary.experiments.length) : "—" },
  ];
  return (
    <Card title="Indicateurs du modèle" icon={<LayersIcon />}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
        {tiles.map((t) => (
          <div key={t.label}>
            <dd className="text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-ink tabular-nums">{t.value}</dd>
            <dt className="mt-1.5 text-xs text-muted">{t.label}</dt>
            {t.note && <p className="mt-0.5 text-[0.7rem] text-muted">{t.note}</p>}
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function EvolutionPlaceholder() {
  return (
    <Card title="Évolution" icon={<ChartIcon />}>
      <div className="grid h-[8.5rem] place-items-center rounded-xl border border-dashed border-line px-4 text-center">
        <p className="max-w-[28ch] text-sm leading-relaxed text-muted">
          Les courbes des effectifs apparaîtront ici pendant l&apos;exécution de la simulation.
        </p>
      </div>
    </Card>
  );
}

interface Slice {
  label: string;
  value: number;
  color: string;
}

/** Répartition des effectifs initiaux par espèce (anneau + légende chiffrée). */
export function InitialDistribution({ summary }: { summary: GamlSummary | null }) {
  const [hover, setHover] = useState<number | null>(null);
  const counted = (summary?.species ?? [])
    .map((s, i) => ({ label: s.name, value: s.initialCount ?? 0, color: seriesColor(i), index: i }))
    .filter((s) => s.value > 0);

  const slices: Slice[] = counted.filter((s) => s.index < SERIES);
  const rest = counted.filter((s) => s.index >= SERIES).reduce((n, s) => n + s.value, 0);
  if (rest > 0) slices.push({ label: "Autres", value: rest, color: "var(--series-other)" });
  const total = slices.reduce((n, s) => n + s.value, 0);

  return (
    <Card title="Répartition initiale" icon={<PieIcon />}>
      {total === 0 ? (
        <div className="grid h-[8.5rem] place-items-center rounded-xl border border-dashed border-line px-4 text-center">
          <p className="max-w-[30ch] text-sm leading-relaxed text-muted">
            {summary
              ? "Le modèle ne fixe pas d'effectif lisible (create … number: …)."
              : "Ouvrez un projet pour voir la répartition de ses agents."}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-5">
          <Donut slices={slices} total={total} hover={hover} onHover={setHover} />
          <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
            {slices.map((s, i) => (
              <li
                key={s.label}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                className={`flex items-center gap-2 rounded-md px-1 transition-colors ${hover === i ? "bg-sunken" : ""}`}
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-ink">{s.label}</span>
                <span className="tabular-nums text-muted">{s.value.toLocaleString("fr-FR")}</span>
                <span className="w-11 text-right tabular-nums font-medium text-ink">
                  {Math.round((s.value / total) * 100)} %
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function Donut({
  slices,
  total,
  hover,
  onHover,
}: {
  slices: Slice[];
  total: number;
  hover: number | null;
  onHover: (i: number | null) => void;
}) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const gap = slices.length > 1 ? 2.5 : 0;
  // Début de chaque arc, cumulé à l'avance (pas de mutation pendant le rendu).
  const starts = slices.map((_, i) => slices.slice(0, i).reduce((n, s) => n + (s.value / total) * c, 0));
  const focus = hover !== null ? slices[hover] : null;
  return (
    <figure className="relative size-[7.5rem] shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={slices.map((s) => `${s.label} ${s.value}`).join(", ")}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--sunken)" strokeWidth="13" />
        {slices.map((s, i) => {
          const len = (s.value / total) * c;
          const dash = Math.max(len - gap, 0.5);
          return (
            <circle
              key={s.label}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={hover === i ? 15 : 13}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-starts[i]}
              onMouseEnter={() => onHover(i)}
              onMouseLeave={() => onHover(null)}
              className="cursor-default transition-[stroke-width] duration-150"
            >
              <title>{`${s.label} : ${s.value.toLocaleString("fr-FR")} (${Math.round((s.value / total) * 100)} %)`}</title>
            </circle>
          );
        })}
      </svg>
      <figcaption className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <span>
          <span className="block text-lg font-semibold leading-none text-ink tabular-nums">
            {(focus ? focus.value : total).toLocaleString("fr-FR")}
          </span>
          <span className="mt-1 block max-w-[5.5rem] truncate text-[0.68rem] text-muted">{focus ? focus.label : "agents"}</span>
        </span>
      </figcaption>
    </figure>
  );
}
