"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import type { AssistantStatus, Conversation, Message, MessageStep } from "@/lib/api";
import {
  AlertIcon,
  BulbIcon,
  ChatIcon,
  ChevronDownIcon,
  ClockIcon,
  GridIcon,
  PlusIcon,
  SendIcon,
  SparkIcon,
  SpinnerIcon,
  TrashIcon,
} from "../icons";
import { Markdown } from "./markdown";

export type AssistantTab = "chat" | "examples" | "history";
type Tab = AssistantTab;

export const EXAMPLES: { title: string; prompt: string }[] = [
  {
    title: "Ressources hospitalières",
    prompt:
      "Crée une simulation de gestion des ressources hospitalières avec des patients, des médecins et des infirmiers. Les patients arrivent, attendent puis sont soignés.",
  },
  {
    title: "Épidémie sur un campus",
    prompt:
      "Crée un modèle SIR : 300 étudiants se déplacent sur un campus, une grippe se transmet par contact puis les malades guérissent.",
  },
  {
    title: "Trafic routier",
    prompt: "Crée un modèle de trafic où des voitures circulent sur une grille de rues avec des feux tricolores.",
  },
  {
    title: "Proies et prédateurs",
    prompt: "Crée un modèle proies-prédateurs : des moutons mangent de l'herbe qui repousse, des loups chassent les moutons.",
  },
  {
    title: "Évacuation d'un bâtiment",
    prompt:
      "Crée un modèle d'évacuation : des personnes quittent un bâtiment par deux sorties en évitant les obstacles.",
  },
  {
    title: "Question sur GAML",
    prompt: "Quelle est la différence entre un reflex et une action en GAML ?",
  },
];

const STEP_LABELS: Record<string, string> = {
  search_docs: "Recherche dans la documentation GAMA",
  read_file: "Lecture d'un fichier",
  write_file: "Écriture d'un fichier",
  create_project: "Création du projet",
  generate_gaml: "Génération du GAML",
  validate_gaml: "Validation du GAML",
};

export function relativeDate(iso: string): string {
  const date = new Date(iso);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return `aujourd'hui, ${time}`;
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (date.toDateString() === yesterday.toDateString()) return `hier, ${time}`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

interface AssistantPanelProps {
  tab: AssistantTab;
  onTabChange: (tab: AssistantTab) => void;
  status: AssistantStatus | null;
  conversations: Conversation[];
  activeId: string | null;
  messages: Message[];
  pending: { text: string; startedAt: number } | null;
  loadingConversation: boolean;
  error: string | null;
  /** Renvoie false si l'envoi a échoué : le texte est alors remis dans la zone de saisie. */
  onSend: (text: string) => Promise<boolean>;
  onOpenConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onOpenProject: (name: string) => void;
}

export function AssistantPanel(props: AssistantPanelProps) {
  const uid = useId();
  const { tab, onTabChange: setTab } = props;
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function pickExample(prompt: string) {
    setDraft(prompt);
    setTab("chat");
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function submit() {
    const text = draft.trim();
    if (!text || props.pending) return;
    setDraft("");
    void props.onSend(text).then((ok) => {
      if (!ok) setDraft(text);
    });
  }

  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: "chat", label: "Chat", icon: <ChatIcon /> },
    { id: "examples", label: "Exemples", icon: <BulbIcon /> },
    { id: "history", label: "Historique", icon: <ClockIcon /> },
  ];

  return (
    <section
      aria-label="Assistant IA"
      className="flex min-h-[32rem] flex-col rounded-2xl border border-line bg-surface shadow-[0_1px_2px_var(--shadow),0_18px_40px_-30px_var(--shadow)] lg:min-h-0"
    >
      <header className="flex items-center gap-3 px-5 pt-5">
        <SparkIcon className="text-[1.4rem] text-accent" />
        <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">Assistant IA</h2>
        <StatusBadge status={props.status} />
      </header>

      <div role="tablist" aria-label="Vues de l'assistant" className="mx-5 mt-4 grid grid-cols-3 gap-1 rounded-xl bg-sunken p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${uid}-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`${uid}-panel`}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-surface text-accent shadow-[0_1px_3px_var(--shadow)]" : "text-muted hover:text-ink"
            }`}
          >
            <span className="text-[1rem]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${tab}`} className="flex min-h-0 flex-1 flex-col">
        {tab === "chat" && (
          <ChatView {...props} draft={draft} setDraft={setDraft} submit={submit} textareaRef={textareaRef} onExample={pickExample} />
        )}
        {tab === "examples" && <ExamplesView onPick={pickExample} />}
        {tab === "history" && (
          <HistoryView
            conversations={props.conversations}
            activeId={props.activeId}
            onOpen={(id) => {
              props.onOpenConversation(id);
              setTab("chat");
            }}
            onNew={() => {
              props.onNewConversation();
              setTab("chat");
              requestAnimationFrame(() => textareaRef.current?.focus());
            }}
            onDelete={props.onDeleteConversation}
          />
        )}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: AssistantStatus | null }) {
  if (!status) {
    return <span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-medium text-muted">Vérification…</span>;
  }
  const { reachable, modelInstalled, model } = status.llm;
  const [label, tone, title] = !reachable
    ? (["Hors ligne", "bg-danger-soft text-danger", "Ollama ne répond pas : démarrez-le pour discuter avec le copilote."] as const)
    : !modelInstalled
      ? (["Modèle absent", "bg-warning-soft text-warning", `Installez le modèle avec : ollama pull ${model}`] as const)
      : (["En ligne", "bg-success-soft text-success", `Modèle ${model} prêt`] as const);
  return (
    <span title={title} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}

interface ChatViewProps extends AssistantPanelProps {
  draft: string;
  setDraft: (value: string) => void;
  submit: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onExample: (prompt: string) => void;
}

function ChatView({
  messages,
  pending,
  loadingConversation,
  error,
  draft,
  setDraft,
  submit,
  textareaRef,
  onExample,
  onOpenProject,
}: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, pending]);

  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pending]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft, textareaRef]);

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  const elapsed = pending ? Math.max(0, Math.round((now - pending.startedAt) / 1000)) : 0;
  const empty = messages.length === 0 && !pending && !loadingConversation;

  return (
    <>
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5" aria-live="polite">
        {loadingConversation && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <SpinnerIcon /> Chargement de la conversation…
          </p>
        )}
        {empty && (
          <div className="pt-6">
            <p className="font-serif text-[1.6rem] leading-tight text-ink">Que voulez-vous modéliser&nbsp;?</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Décrivez le système à étudier : le copilote écrit le modèle GAML, le vérifie et crée le projet dans votre
              espace. Vous pouvez aussi lui poser une question sur GAMA.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              {EXAMPLES.slice(0, 3).map((ex) => (
                <button
                  key={ex.title}
                  type="button"
                  onClick={() => onExample(ex.prompt)}
                  className="rounded-xl border border-line px-3.5 py-2.5 text-left text-sm text-ink transition-colors hover:border-accent hover:bg-accent-soft"
                >
                  {ex.title}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onOpenProject={onOpenProject} />
        ))}
        {pending && (
          <>
            <UserBubble text={pending.text} />
            <div className="flex gap-3">
              <AssistantAvatar />
              <div className="rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3 text-sm text-muted">
                <p className="flex items-center gap-2" role="status">
                  <SpinnerIcon className="text-accent" /> Le copilote travaille… {elapsed} s
                </p>
                {elapsed >= 20 && (
                  <p className="mt-1.5 text-xs">
                    Les modèles locaux prennent souvent une à deux minutes, surtout pour créer un projet.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="border-t border-line px-5 pb-4 pt-3">
        {error && (
          <p role="alert" className="mb-2 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            <AlertIcon className="mt-0.5 shrink-0" /> {error}
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex items-end gap-2 rounded-2xl border border-field bg-canvas p-1.5 pl-3.5 transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--ring)]"
        >
          <label htmlFor="composer" className="sr-only">
            Votre demande au copilote
          </label>
          <textarea
            id="composer"
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={4000}
            placeholder="Décrivez votre scénario ou posez une question…"
            className="max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent py-2 text-[0.92rem] text-ink outline-none placeholder:text-placeholder"
          />
          <button
            type="submit"
            disabled={!draft.trim() || !!pending}
            aria-label="Envoyer la demande"
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--btn-from),var(--btn-to))] text-[1.05rem] text-white transition-[filter,opacity] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? <SpinnerIcon /> : <SendIcon />}
          </button>
        </form>
        <p className="mt-2 text-xs text-muted">
          <kbd className="font-sans">Entrée</kbd> pour envoyer, <kbd className="font-sans">Maj + Entrée</kbd> pour aller à
          la ligne.
        </p>
      </div>
    </>
  );
}

function AssistantAvatar() {
  return (
    <span
      aria-hidden="true"
      className="grid size-8 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,var(--btn-from),var(--btn-to))] text-[0.95rem] text-white"
    >
      <SparkIcon />
    </span>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-accent-soft px-4 py-2.5 text-[0.92rem] leading-relaxed text-ink">
        {text}
      </p>
    </div>
  );
}

function MessageBubble({ message, onOpenProject }: { message: Message; onOpenProject: (name: string) => void }) {
  if (message.role === "user") return <UserBubble text={message.content} />;
  const failed = message.status === "error";
  return (
    <div className="flex gap-3">
      <AssistantAvatar />
      <div className="min-w-0 flex-1 space-y-2.5">
        <div
          className={`rounded-2xl rounded-tl-md border px-4 py-3 text-ink ${
            failed ? "border-danger/40 bg-danger-soft" : "border-line bg-surface"
          }`}
        >
          {failed ? (
            <p className="flex items-start gap-2 text-sm text-danger">
              <AlertIcon className="mt-0.5 shrink-0" /> {message.content}
            </p>
          ) : (
            <Markdown text={message.content} />
          )}
          {message.steps.length > 0 && <Steps steps={message.steps} />}
        </div>
        {message.projects.map((name) => (
          <div key={name} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[linear-gradient(160deg,var(--panel-from),var(--panel-to))] text-[1.3rem] text-sim-s">
              <GridIcon />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{name}</p>
              <p className="text-xs text-muted">Projet créé dans votre espace</p>
            </div>
            <button
              type="button"
              onClick={() => onOpenProject(name)}
              className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
            >
              Ouvrir le projet
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Steps({ steps }: { steps: MessageStep[] }) {
  return (
    <details className="group mt-2.5 border-t border-line pt-2 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
        <ChevronDownIcon className="transition-transform group-open:rotate-180" />
        {steps.length === 1 ? "1 outil utilisé" : `${steps.length} outils utilisés`}
      </summary>
      <ol className="mt-2 space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="rounded-lg bg-sunken px-3 py-2">
            <p className="text-xs font-semibold text-ink">{STEP_LABELS[step.tool] ?? step.tool}</p>
            <p className="mt-1 line-clamp-3 break-all font-mono text-[0.7rem] leading-relaxed text-muted">{step.content}</p>
          </li>
        ))}
      </ol>
    </details>
  );
}

function ExamplesView({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <ul className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-5 py-5">
      {EXAMPLES.map((ex) => (
        <li key={ex.title}>
          <button
            type="button"
            onClick={() => onPick(ex.prompt)}
            className="w-full rounded-xl border border-line px-4 py-3 text-left transition-colors hover:border-accent hover:bg-accent-soft"
          >
            <span className="block text-sm font-semibold text-ink">{ex.title}</span>
            <span className="mt-1 block text-sm leading-relaxed text-muted">{ex.prompt}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function HistoryView({
  conversations,
  activeId,
  onOpen,
  onNew,
  onDelete,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 py-5">
      <button
        type="button"
        onClick={onNew}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
      >
        <PlusIcon /> Nouvelle conversation
      </button>
      {conversations.length === 0 ? (
        <p className="mt-6 text-sm leading-relaxed text-muted">
          Aucune conversation pour l&apos;instant. Vos échanges avec le copilote seront enregistrés ici.
        </p>
      ) : (
        <ul className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {conversations.map((c) => (
            <li key={c.id} className="group relative">
              <button
                type="button"
                onClick={() => onOpen(c.id)}
                aria-current={c.id === activeId ? "true" : undefined}
                className={`w-full rounded-xl px-3 py-2.5 pr-11 text-left transition-colors ${
                  c.id === activeId ? "bg-accent-soft" : "hover:bg-sunken"
                }`}
              >
                <span className="block truncate text-sm font-medium text-ink">{c.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{relativeDate(c.updatedAt)}</span>
              </button>
              {confirming === c.id ? (
                <span className="absolute inset-y-0 right-1 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(c.id);
                      setConfirming(null);
                    }}
                    className="rounded-lg bg-danger px-2 py-1 text-xs font-semibold text-white"
                  >
                    Supprimer
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    className="rounded-lg px-2 py-1 text-xs text-muted hover:text-ink"
                  >
                    Annuler
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(c.id)}
                  aria-label={`Supprimer la conversation « ${c.title} »`}
                  className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted opacity-0 transition-opacity hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <TrashIcon />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
