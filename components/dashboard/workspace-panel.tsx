"use client";

import { useEffect, useState, type ReactNode } from "react";
import { api, ApiError, type GamlSummary, type ProjectFile, type ProjectInfo, type Validation } from "@/lib/api";
import {
  AlertIcon,
  CheckCircleIcon,
  CodeIcon,
  FileIcon,
  GridIcon,
  PauseIcon,
  PlayIcon,
  ResetIcon,
  SpinnerIcon,
  StopIcon,
} from "../icons";
import { relativeDate } from "./assistant-panel";
import { GamlCode } from "./gaml-code";
import { EvolutionPlaceholder, InitialDistribution, ModelIndicators, seriesColor } from "./insights";

export type WorkspaceTab = "simulation" | "code" | "projects";

interface WorkspacePanelProps {
  tab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  projects: ProjectInfo[];
  selected: string | null;
  onSelect: (name: string) => void;
  /** Change quand l'agent a modifié des projets : recharge le projet affiché. */
  refreshKey: number;
  gamaInstalled: boolean;
  onUnauthorized: () => void;
}

interface ProjectData {
  name: string;
  summary: GamlSummary | null;
  mainFile: string | null;
  files: ProjectFile[];
}

const RUN_SOON = "L'exécution de la simulation dans la page arrive bientôt.";

export function WorkspacePanel(props: WorkspacePanelProps) {
  const { tab, onTabChange, projects, selected } = props;
  const [data, setData] = useState<ProjectData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [validating, setValidating] = useState(false);
  const [openFile, setOpenFile] = useState<{ path: string; content: string } | null>(null);
  const { onUnauthorized } = props;

  // Charge le projet sélectionné : fichiers + structure du modèle.
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    Promise.all([api.files(selected), api.summary(selected).catch((e: unknown) => (e instanceof ApiError && e.status === 404 ? null : Promise.reject(e)))])
      .then(([files, summary]) => {
        if (cancelled) return;
        setData({ name: selected, files, summary: summary?.summary ?? null, mainFile: summary?.file ?? null });
        setLoadError(null);
        setValidation(null);
        setOpenFile(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError) setLoadError(e.message);
        else onUnauthorized();
      });
    return () => {
      cancelled = true;
    };
  }, [selected, props.refreshKey, onUnauthorized]);

  // Ouvre le modèle principal par défaut dans l'onglet Code.
  useEffect(() => {
    if (tab !== "code" || !data || openFile) return;
    const path = data.mainFile ?? data.files[0]?.path;
    if (!path) return;
    let cancelled = false;
    api
      .readFile(path)
      .then((f) => !cancelled && setOpenFile(f))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [tab, data, openFile]);

  async function validate() {
    if (!selected) return;
    setValidating(true);
    try {
      setValidation(await api.validate(selected));
    } catch (e) {
      if (e instanceof ApiError) setValidation({ file: "", validatedBy: "heuristic", valid: false, errors: [e.message], warnings: [] });
      else onUnauthorized();
    } finally {
      setValidating(false);
    }
  }

  async function show(path: string) {
    try {
      setOpenFile(await api.readFile(path));
    } catch {
      /* fichier disparu entre-temps : la liste sera rafraîchie au prochain chargement */
    }
  }

  const current = data && data.name === selected ? data : null;
  const tabs: { id: WorkspaceTab; label: string; icon: ReactNode }[] = [
    { id: "simulation", label: "Simulation", icon: <PlayIcon /> },
    { id: "code", label: "Code GAML", icon: <CodeIcon /> },
    { id: "projects", label: `Projets${projects.length ? ` (${projects.length})` : ""}`, icon: <GridIcon /> },
  ];

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-2 shadow-[0_1px_2px_var(--shadow)]">
        <div role="tablist" aria-label="Vues du projet" className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => onTabChange(t.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-[linear-gradient(90deg,var(--btn-from),var(--btn-to))] text-white shadow-[0_6px_16px_-10px_var(--btn-to)]"
                  : "text-muted hover:bg-sunken hover:text-ink"
              }`}
            >
              <span className="text-[0.95rem]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <RunButton icon={<PlayIcon />} label="Lancer" primary />
          <RunButton icon={<PauseIcon />} label="Pause" />
          <RunButton icon={<StopIcon />} label="Arrêter" />
          <RunButton icon={<ResetIcon />} label="Réinitialiser" />
          <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden="true" />
          <button
            type="button"
            onClick={validate}
            disabled={!current?.mainFile || validating}
            className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {validating ? <SpinnerIcon /> : <CheckCircleIcon />}
            {validating ? "Vérification…" : props.gamaInstalled ? "Valider avec GAMA" : "Vérifier le modèle"}
          </button>
        </div>
      </div>

      {validating && props.gamaInstalled && (
        <p className="-mt-1 text-xs text-muted" role="status">
          La première vérification démarre GAMA en arrière-plan : cela peut prendre jusqu&apos;à une minute.
        </p>
      )}
      {validation && <ValidationBanner validation={validation} />}
      {loadError && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          <AlertIcon className="mt-0.5 shrink-0" /> {loadError}
        </p>
      )}

      {tab === "simulation" && (
        <>
          <Stage project={selected ? current : null} loading={!!selected && !current} validation={validation} />
          <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
            <ModelIndicators summary={current?.summary ?? null} />
            <EvolutionPlaceholder />
            <InitialDistribution summary={current?.summary ?? null} />
          </div>
        </>
      )}

      {tab === "code" && (
        <CodeView project={current} openFile={openFile} onOpen={show} hasProject={!!selected} />
      )}

      {tab === "projects" && (
        <ProjectGrid
          projects={projects}
          selected={selected}
          onOpen={(name) => {
            props.onSelect(name);
            onTabChange("simulation");
          }}
        />
      )}
    </div>
  );
}

/** Commandes d'exécution : visibles mais inactives tant que le moteur de simulation n'est pas branché. */
function RunButton({ icon, label, primary }: { icon: ReactNode; label: string; primary?: boolean }) {
  return (
    <button
      type="button"
      disabled
      title={`${label} : ${RUN_SOON}`}
      aria-label={label}
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium opacity-50 disabled:cursor-not-allowed ${
        primary ? "bg-[linear-gradient(90deg,var(--btn-from),var(--btn-to))] text-white" : "border border-line text-muted"
      }`}
    >
      <span className="text-[0.9rem]">{icon}</span>
      <span className={primary ? "" : "hidden 2xl:inline"}>{label}</span>
    </button>
  );
}

function ValidationBanner({ validation }: { validation: Validation }) {
  const by = validation.validatedBy === "gama" ? "par GAMA" : "par contrôle rapide (GAMA non installé)";
  if (validation.valid) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
        <CheckCircleIcon className="shrink-0" /> Le modèle compile sans erreur, vérifié {by}.
      </p>
    );
  }
  return (
    <div role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
      <p className="flex items-center gap-2 font-medium">
        <AlertIcon className="shrink-0" />
        {validation.errors.length > 1 ? `${validation.errors.length} erreurs` : "Une erreur"} détectée{validation.errors.length > 1 ? "s" : ""} {by}
      </p>
      <ul className="mt-2 space-y-1 pl-6 font-mono text-xs">
        {validation.errors.slice(0, 6).map((err, i) => (
          <li key={i} className="list-disc">
            {err}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stage({
  project,
  loading,
  validation,
}: {
  project: ProjectData | null;
  loading: boolean;
  validation: Validation | null;
}) {
  const species = project?.summary?.species ?? [];
  const experiment = project?.summary?.experiments.find((e) => e.type === "gui") ?? project?.summary?.experiments[0];
  return (
    <section
      aria-label="Simulation"
      className="relative min-h-[22rem] flex-1 overflow-hidden rounded-2xl bg-[linear-gradient(160deg,var(--panel-from),var(--panel-to))] text-panel-ink shadow-[0_18px_40px_-28px_var(--shadow)]"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-60 [background-image:linear-gradient(var(--panel-line)_1px,transparent_1px),linear-gradient(90deg,var(--panel-line)_1px,transparent_1px)] [background-size:36px_36px]"
      />

      {species.length > 0 && (
        <div className="absolute left-4 top-4 w-56 rounded-xl border border-panel-line bg-panel-deep/85 p-3 backdrop-blur-sm">
          <p className="text-[0.7rem] text-panel-muted">Effectifs au départ</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {species.slice(0, 7).map((s, i) => (
              <li key={s.name} className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: seriesColor(i) }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
                <span className="tabular-nums font-semibold">{s.initialCount?.toLocaleString("fr-FR") ?? "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="relative grid min-h-[22rem] place-items-center px-6 py-10 text-center">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-panel-muted">
            <SpinnerIcon /> Chargement du projet…
          </p>
        ) : !project ? (
          <div className="max-w-sm">
            <GridIcon className="mx-auto text-[2.2rem] text-sim-s" />
            <p className="mt-4 font-serif text-[1.5rem] leading-tight">Aucun projet ouvert</p>
            <p className="mt-2 text-sm leading-relaxed text-panel-muted">
              Décrivez un modèle à l&apos;assistant : le projet qu&apos;il crée s&apos;ouvrira ici.
            </p>
          </div>
        ) : (
          <div className="max-w-md">
            <p className="text-sm text-panel-muted">Projet</p>
            <p className="mt-1 font-serif text-[1.9rem] leading-tight">{project.name}</p>
            <p className="mt-3 text-sm leading-relaxed text-panel-muted">
              {project.summary
                ? `${species.length} espèce${species.length > 1 ? "s" : ""}${experiment ? `, expérience « ${experiment.name} »` : ""}${
                    validation?.valid ? ", modèle vérifié" : ""
                  }.`
                : "Ce projet ne contient pas encore de modèle .gaml."}
            </p>
            <p id="run-soon" className="mt-4 rounded-lg border border-panel-line px-3 py-2 text-xs leading-relaxed text-panel-muted">
              {RUN_SOON} En attendant, ouvrez le dossier du projet dans GAMA pour le lancer.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function CodeView({
  project,
  openFile,
  onOpen,
  hasProject,
}: {
  project: ProjectData | null;
  openFile: { path: string; content: string } | null;
  onOpen: (path: string) => void;
  hasProject: boolean;
}) {
  if (!hasProject) {
    return <EmptyCard text="Aucun projet ouvert. Le code des modèles créés par l'assistant s'affichera ici." />;
  }
  if (!project) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <SpinnerIcon /> Chargement…
      </p>
    );
  }
  return (
    <div className="grid min-h-[28rem] gap-4 lg:grid-cols-[15rem_1fr]">
      <nav aria-label="Fichiers du projet" className="rounded-2xl border border-line bg-surface p-3">
        <p className="px-2 text-xs font-medium text-muted">{project.files.length} fichier{project.files.length > 1 ? "s" : ""}</p>
        <ul className="mt-2 space-y-0.5">
          {project.files.map((f) => (
            <li key={f.path}>
              <button
                type="button"
                onClick={() => onOpen(f.path)}
                aria-current={openFile?.path === f.path ? "true" : undefined}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                  openFile?.path === f.path ? "bg-accent-soft text-ink" : "text-muted hover:bg-sunken hover:text-ink"
                }`}
              >
                <FileIcon className="shrink-0" />
                <span className="truncate">{f.path.split("/").slice(1).join("/") || f.path}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <section className="min-w-0 overflow-hidden rounded-2xl border border-line bg-surface">
        {openFile ? (
          <>
            <p className="border-b border-line px-4 py-2.5 font-mono text-xs text-muted">{openFile.path}</p>
            {openFile.path.endsWith(".gaml") ? (
              <GamlCode code={openFile.content} className="max-h-[36rem] p-4" />
            ) : (
              <pre className="max-h-[36rem] overflow-auto p-4 font-mono text-[0.78rem] leading-[1.7] text-ink">{openFile.content}</pre>
            )}
          </>
        ) : (
          <p className="p-6 text-sm text-muted">Choisissez un fichier.</p>
        )}
      </section>
    </div>
  );
}

function ProjectGrid({
  projects,
  selected,
  onOpen,
}: {
  projects: ProjectInfo[];
  selected: string | null;
  onOpen: (name: string) => void;
}) {
  if (projects.length === 0) {
    return <EmptyCard text="Votre espace ne contient encore aucun projet. Demandez à l'assistant d'en créer un." />;
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((p) => (
        <li key={p.name}>
          <button
            type="button"
            onClick={() => onOpen(p.name)}
            aria-current={p.name === selected ? "true" : undefined}
            className={`w-full rounded-2xl border bg-surface p-4 text-left transition-colors hover:border-accent ${
              p.name === selected ? "border-accent" : "border-line"
            }`}
          >
            <span className="grid size-11 place-items-center rounded-xl bg-[linear-gradient(160deg,var(--panel-from),var(--panel-to))] text-[1.2rem] text-sim-s">
              <GridIcon />
            </span>
            <span className="mt-3 block truncate font-semibold text-ink">{p.name}</span>
            <span className="mt-1 block text-xs text-muted">
              {p.files} fichier{p.files > 1 ? "s" : ""}, modifié {relativeDate(p.updatedAt)}
            </span>
            <span className={`mt-3 inline-block rounded-full px-2 py-0.5 text-xs ${p.mainModel ? "bg-accent-soft text-accent" : "bg-sunken text-muted"}`}>
              {p.mainModel ? p.mainModel.split("/").pop() : "Sans modèle"}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="grid min-h-[16rem] place-items-center rounded-2xl border border-dashed border-line bg-surface px-6 text-center">
      <p className="max-w-[40ch] text-sm leading-relaxed text-muted">{text}</p>
    </div>
  );
}
