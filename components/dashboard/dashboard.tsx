"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, ApiError, UnauthorizedError, type AssistantStatus, type Conversation, type Message, type ProjectInfo } from "@/lib/api";
import { apiFetch, getCurrentUser, logout, type AuthUser } from "@/lib/auth";
import {
  ChevronDownIcon,
  ClockIcon,
  ExternalIcon,
  FolderIcon,
  GridIcon,
  HomeIcon,
  LayersIcon,
  LogoutIcon,
  MenuIcon,
  SearchIcon,
  SpinnerIcon,
} from "../icons";
import { Logo } from "../logo";
import { ThemeToggle } from "../theme-toggle";
import { AssistantPanel, relativeDate, type AssistantTab } from "./assistant-panel";
import { WorkspacePanel, type WorkspaceTab } from "./workspace-panel";

const GAMA_DOCS = "https://gama-platform.org/wiki/Home";

export function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState<{ text: string; startedAt: number } | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [assistantTab, setAssistantTab] = useState<AssistantTab>("chat");
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("simulation");
  const [navOpen, setNavOpen] = useState(false);

  const toLogin = useCallback(() => router.replace("/login"), [router]);

  // Session, puis données de l'espace. Sans session valide : retour à la connexion.
  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then(async (current) => {
      if (cancelled) return;
      if (!current) return toLogin();
      setUser(current);
      try {
        const [convs, projs] = await Promise.all([api.conversations(), api.projects()]);
        if (cancelled) return;
        setConversations(convs);
        setProjects(projs);
        setSelected((s) => s ?? projs[0]?.name ?? null);
      } catch (e) {
        if (e instanceof UnauthorizedError) toLogin();
      }
      api
        .status()
        .then((s) => !cancelled && setStatus(s))
        .catch(() => undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [toLogin]);

  const send = useCallback(
    async (text: string): Promise<boolean> => {
      setPending({ text, startedAt: Date.now() });
      setChatError(null);
      try {
        const result = activeId ? await api.sendMessage(activeId, text) : await api.startConversation(text);
        setActiveId(result.conversation.id);
        setMessages((prev) => [...prev, ...result.messages]);
        setConversations((prev) => [result.conversation, ...prev.filter((c) => c.id !== result.conversation.id)]);
        const touched = result.messages.flatMap((m) => m.projects);
        if (touched.length) {
          setProjects(await api.projects());
          setSelected(touched[0]);
          setRefreshKey((k) => k + 1);
        }
        return true;
      } catch (e) {
        if (e instanceof UnauthorizedError) toLogin();
        else setChatError(e instanceof ApiError ? e.message : "La demande n'a pas pu être envoyée.");
        return false;
      } finally {
        setPending(null);
      }
    },
    [activeId, toLogin],
  );

  const openConversation = useCallback(
    async (id: string) => {
      setActiveId(id);
      setMessages([]);
      setChatError(null);
      setLoadingConversation(true);
      try {
        const { messages: list } = await api.conversation(id);
        setMessages(list);
      } catch (e) {
        if (e instanceof UnauthorizedError) toLogin();
        else setChatError(e instanceof ApiError ? e.message : "Conversation indisponible.");
      } finally {
        setLoadingConversation(false);
      }
    },
    [toLogin],
  );

  const newConversation = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setChatError(null);
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await api.deleteConversation(id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (id === activeId) newConversation();
      } catch (e) {
        if (e instanceof UnauthorizedError) toLogin();
      }
    },
    [activeId, newConversation, toLogin],
  );

  const openProject = useCallback((name: string) => {
    setSelected(name);
    setWorkspaceTab("simulation");
  }, []);

  if (!user) {
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-muted">
        <p className="flex items-center gap-2" role="status">
          <SpinnerIcon /> Ouverture de votre espace…
        </p>
      </div>
    );
  }

  const nav = (
    <SideNav
      onHome={() => {
        setWorkspaceTab("simulation");
        setAssistantTab("chat");
        setNavOpen(false);
      }}
      onProjects={() => {
        setWorkspaceTab("projects");
        setNavOpen(false);
      }}
      onHistory={() => {
        setAssistantTab("history");
        setNavOpen(false);
      }}
      active={workspaceTab === "projects" ? "projects" : assistantTab === "history" ? "history" : "home"}
    />
  );

  return (
    <div className="flex min-h-dvh lg:h-dvh lg:overflow-hidden">
      <aside className="hidden w-60 shrink-0 lg:block">{nav}</aside>
      {navOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-black/40" onClick={() => setNavOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64">{nav}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          user={user}
          conversations={conversations}
          projects={projects}
          onMenu={() => setNavOpen(true)}
          onOpenConversation={(id) => {
            setAssistantTab("chat");
            void openConversation(id);
          }}
          onOpenProject={openProject}
          onSignOut={async (everywhere) => {
            if (everywhere) await apiFetch("/auth/logout-all", { method: "POST" }).catch(() => undefined);
            else await logout();
            toLogin();
          }}
        />

        <main className="grid min-h-0 flex-1 gap-5 px-4 pb-5 sm:px-6 lg:grid-cols-[minmax(22rem,26rem)_minmax(0,1fr)] lg:overflow-hidden">
          <AssistantPanel
            tab={assistantTab}
            onTabChange={setAssistantTab}
            status={status}
            conversations={conversations}
            activeId={activeId}
            messages={messages}
            pending={pending}
            loadingConversation={loadingConversation}
            error={chatError}
            onSend={send}
            onOpenConversation={openConversation}
            onNewConversation={newConversation}
            onDeleteConversation={deleteConversation}
            onOpenProject={openProject}
          />
          <div className="min-h-0 lg:overflow-y-auto lg:pr-1">
            <WorkspacePanel
              tab={workspaceTab}
              onTabChange={setWorkspaceTab}
              projects={projects}
              selected={selected}
              onSelect={setSelected}
              refreshKey={refreshKey}
              gamaInstalled={status?.gama.installed ?? false}
              onUnauthorized={toLogin}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function SideNav({
  active,
  onHome,
  onProjects,
  onHistory,
}: {
  active: "home" | "projects" | "history";
  onHome: () => void;
  onProjects: () => void;
  onHistory: () => void;
}) {
  const item = (key: typeof active, label: string, icon: ReactNode, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-current={active === key ? "page" : undefined}
      className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
        active === key
          ? "bg-[linear-gradient(90deg,var(--btn-from),var(--btn-to))] text-white shadow-[0_8px_20px_-12px_var(--btn-to)]"
          : "text-panel-muted hover:bg-white/5 hover:text-panel-ink"
      }`}
    >
      <span className="text-[1.15rem]">{icon}</span>
      {label}
    </button>
  );
  const soon = (label: string, icon: ReactNode) => (
    <span className="flex items-center gap-3 px-3.5 py-2.5 text-sm text-panel-muted/70" aria-disabled="true">
      <span className="text-[1.15rem]">{icon}</span>
      {label}
      <span className="ml-auto rounded-full border border-panel-line px-1.5 py-px text-[0.65rem]">bientôt</span>
    </span>
  );
  return (
    <nav
      aria-label="Navigation principale"
      className="flex h-full flex-col bg-[linear-gradient(180deg,var(--panel-from),var(--panel-to))] px-4 py-6 text-panel-ink"
    >
      <div className="px-2">
        <Logo inverted />
      </div>
      <div className="mt-8 space-y-1.5">
        {item("home", "Accueil", <HomeIcon />, onHome)}
        {item("projects", "Mes projets", <FolderIcon />, onProjects)}
        {item("history", "Historique", <ClockIcon />, onHistory)}
        {soon("Bibliothèque d'agents", <LayersIcon />)}
        {soon("Analyse", <GridIcon />)}
      </div>
      <div className="mt-auto space-y-4 px-2">
        <a
          href={GAMA_DOCS}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-sm text-panel-muted transition-colors hover:text-panel-ink"
        >
          Documentation GAMA <ExternalIcon />
        </a>
        <p className="text-xs text-panel-muted">GAMA-Copilot v0.1</p>
      </div>
    </nav>
  );
}

function TopBar({
  user,
  conversations,
  projects,
  onMenu,
  onOpenConversation,
  onOpenProject,
  onSignOut,
}: {
  user: AuthUser;
  conversations: Conversation[];
  projects: ProjectInfo[];
  onMenu: () => void;
  onOpenConversation: (id: string) => void;
  onOpenProject: (name: string) => void;
  onSignOut: (everywhere: boolean) => Promise<void>;
}) {
  return (
    <header className="flex items-center gap-3 px-4 py-4 sm:px-6">
      <button type="button" onClick={onMenu} aria-label="Ouvrir le menu" className="grid size-10 place-items-center rounded-xl border border-line bg-surface text-[1.2rem] lg:hidden">
        <MenuIcon />
      </button>
      <div className="mr-2 hidden min-w-0 sm:block">
        <p className="truncate text-lg font-semibold tracking-[-0.01em] text-ink">Bonjour {user.name.split(" ")[0]}</p>
        <p className="truncate text-xs text-muted">Modélisation multi-agents avec GAMA</p>
      </div>
      <Search conversations={conversations} projects={projects} onOpenConversation={onOpenConversation} onOpenProject={onOpenProject} />
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <UserMenu user={user} onSignOut={onSignOut} />
      </div>
    </header>
  );
}

function Search({
  conversations,
  projects,
  onOpenConversation,
  onOpenProject,
}: {
  conversations: Conversation[];
  projects: ProjectInfo[];
  onOpenConversation: (id: string) => void;
  onOpenProject: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return [
      ...projects
        .filter((p) => p.name.toLowerCase().includes(q))
        .slice(0, 5)
        .map((p) => ({ key: `p-${p.name}`, label: p.name, hint: "Projet", run: () => onOpenProject(p.name) })),
      ...conversations
        .filter((c) => c.title.toLowerCase().includes(q))
        .slice(0, 6)
        .map((c) => ({ key: `c-${c.id}`, label: c.title, hint: relativeDate(c.updatedAt), run: () => onOpenConversation(c.id) })),
    ];
  }, [query, projects, conversations, onOpenConversation, onOpenProject]);

  function choose(i: number) {
    results[i]?.run();
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  return (
    <div className="relative hidden w-full max-w-md md:block">
      <label className="flex h-11 items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 text-muted focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--ring)]">
        <SearchIcon className="shrink-0 text-[1.05rem]" />
        <span className="sr-only">Rechercher un projet ou une conversation</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setCursor((c) => Math.min(c + 1, results.length - 1));
            else if (e.key === "ArrowUp") setCursor((c) => Math.max(c - 1, 0));
            else if (e.key === "Enter") choose(cursor);
            else if (e.key === "Escape") inputRef.current?.blur();
          }}
          placeholder="Rechercher un projet ou une conversation…"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="search-results"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-placeholder"
        />
        <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-[0.7rem] lg:block">Ctrl K</kbd>
      </label>
      {open && query.trim() && (
        <ul
          id="search-results"
          role="listbox"
          className="absolute inset-x-0 top-12 z-30 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-[0_18px_40px_-16px_var(--shadow)]"
        >
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">Aucun résultat pour « {query.trim()} ».</li>
          ) : (
            results.map((r, i) => (
              <li key={r.key} role="option" aria-selected={i === cursor}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm ${i === cursor ? "bg-sunken" : ""}`}
                >
                  <span className="min-w-0 flex-1 truncate text-ink">{r.label}</span>
                  <span className="shrink-0 text-xs text-muted">{r.hint}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function UserMenu({ user, onSignOut }: { user: AuthUser; onSignOut: (everywhere: boolean) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials = user.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  async function signOut(everywhere: boolean) {
    setBusy(true);
    await onSignOut(everywhere);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-surface"
      >
        <span className="grid size-9 place-items-center rounded-full bg-[linear-gradient(135deg,var(--btn-from),var(--btn-to))] text-sm font-semibold text-white">
          {initials || "?"}
        </span>
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-ink sm:block">{user.name}</span>
        <ChevronDownIcon className="text-muted" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-30 w-64 rounded-xl border border-line bg-surface p-1.5 shadow-[0_18px_40px_-16px_var(--shadow)]">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={() => signOut(false)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-sunken disabled:opacity-60"
          >
            <LogoutIcon /> Se déconnecter
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={() => signOut(true)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft disabled:opacity-60"
          >
            <LogoutIcon /> Déconnecter tous mes appareils
          </button>
        </div>
      )}
    </div>
  );
}
