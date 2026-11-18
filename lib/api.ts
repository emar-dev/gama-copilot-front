/**
 * Client des routes de l'espace de travail. Toutes passent par apiFetch : cookies httpOnly
 * joints automatiquement, et une tentative de rafraîchissement de session sur un 401.
 */
import { apiFetch } from "./auth";

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageStep {
  tool: string;
  content: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "ok" | "error";
  steps: MessageStep[];
  projects: string[];
  createdAt: string;
}

export interface ProjectInfo {
  name: string;
  mainModel: string | null;
  files: number;
  updatedAt: string;
}

export interface ProjectFile {
  path: string;
  size: number;
  updatedAt: string;
}

export interface GamlSpecies {
  name: string;
  kind: "species" | "grid";
  parent: string | null;
  skills: string[];
  attributes: { type: string; name: string; initial: string | null }[];
  reflexes: string[];
  actions: string[];
  aspects: string[];
  initialCount: number | null;
}

export interface GamlSummary {
  model: string | null;
  lines: number;
  globals: { type: string; name: string; initial: string | null }[];
  species: GamlSpecies[];
  experiments: { name: string; type: string; parameters: { label: string; variable: string }[]; displays: string[] }[];
}

export interface Validation {
  file: string;
  validatedBy: "gama" | "heuristic";
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AssistantStatus {
  llm: { reachable: boolean; model: string; modelInstalled: boolean };
  gama: { installed: boolean };
}

/** Session expirée ou révoquée : l'interface renvoie vers la connexion. */
export class UnauthorizedError extends Error {}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await apiFetch(path, {
      ...init,
      headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
    });
  } catch {
    throw new ApiError("Impossible de joindre l'API GAMA-Copilot. Vérifiez qu'elle est démarrée.", 0);
  }
  if (res.status === 401) throw new UnauthorizedError("Session expirée");
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const raw = data && typeof data === "object" && "message" in data ? (data as { message: unknown }).message : null;
    const message = Array.isArray(raw) ? String(raw[0]) : typeof raw === "string" ? raw : "La requête a échoué.";
    throw new ApiError(message, res.status);
  }
  return data as T;
}

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  status: () => call<AssistantStatus>("/assistant/status"),

  conversations: () => call<{ conversations: Conversation[] }>("/conversations").then((r) => r.conversations),
  conversation: (id: string) => call<{ conversation: Conversation; messages: Message[] }>(`/conversations/${id}`),
  startConversation: (message: string) =>
    call<{ conversation: Conversation; messages: Message[] }>("/conversations", {
      method: "POST",
      body: json({ message }),
    }),
  sendMessage: (id: string, message: string) =>
    call<{ conversation: Conversation; messages: Message[] }>(`/conversations/${id}/messages`, {
      method: "POST",
      body: json({ message }),
    }),
  deleteConversation: (id: string) => call<void>(`/conversations/${id}`, { method: "DELETE" }),

  projects: () => call<{ projects: ProjectInfo[] }>("/projects").then((r) => r.projects),
  files: (project: string) =>
    call<{ files: ProjectFile[] }>(`/projects/${encodeURIComponent(project)}/files`).then((r) => r.files),
  summary: (project: string) =>
    call<{ file: string; summary: GamlSummary }>(`/projects/${encodeURIComponent(project)}/summary`),
  validate: (project: string) =>
    call<Validation>(`/projects/${encodeURIComponent(project)}/validate`, { method: "POST", body: json({}) }),
  readFile: (path: string) =>
    call<{ path: string; content: string }>(`/project/file?path=${encodeURIComponent(path)}`),
};
