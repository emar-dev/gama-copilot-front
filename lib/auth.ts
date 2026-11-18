/**
 * Client d'authentification. Les jetons JWT vivent uniquement dans des cookies httpOnly
 * posés par l'API : ce code ne les voit jamais et ne stocke rien dans localStorage.
 * Chaque appel part avec credentials: "include" pour que le navigateur joigne les cookies.
 */

export type AuthMode = "login" | "register";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthPayload {
  email: string;
  password: string;
  name?: string;
  remember?: boolean;
}

export type AuthResult = { ok: true; user: AuthUser } | { ok: false; error: string };

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

const NETWORK_ERROR = "Impossible de joindre l'API GAMA-Copilot. Vérifiez qu'elle est démarrée, puis réessayez.";

function send(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
  });
}

async function readJson(res: Response): Promise<unknown> {
  return res.json().catch(() => null);
}

function errorMessage(status: number, data: unknown): string {
  if (status === 429) return "Trop de tentatives. Patientez une minute avant de réessayer.";
  if (status >= 500) return "Le serveur a rencontré une erreur. Réessayez dans un instant.";
  const raw = data && typeof data === "object" && "message" in data ? (data as { message: unknown }).message : null;
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
  if (typeof raw === "string" && raw) return raw;
  return status === 401 ? "E-mail ou mot de passe incorrect." : "La requête a été refusée.";
}

function userFrom(data: unknown): AuthUser | null {
  if (data && typeof data === "object" && "user" in data) return (data as { user: AuthUser }).user;
  return null;
}

export async function authenticate(mode: AuthMode, payload: AuthPayload): Promise<AuthResult> {
  const body =
    mode === "register"
      ? { name: payload.name, email: payload.email, password: payload.password, remember: payload.remember }
      : { email: payload.email, password: payload.password, remember: payload.remember };
  try {
    const res = await send(`/auth/${mode}`, { method: "POST", body: JSON.stringify(body) });
    const data = await readJson(res);
    const user = userFrom(data);
    if (!res.ok || !user) return { ok: false, error: errorMessage(res.status, data) };
    return { ok: true, user };
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}

/**
 * Un seul rafraîchissement à la fois : l'API fait tourner le refresh token à chaque usage
 * et révoque la session si un ancien jeton est rejoué. Deux appels parallèles avec le même
 * cookie déconnecteraient l'utilisateur, d'où cette promesse partagée.
 */
let refreshing: Promise<AuthUser | null> | null = null;

export function refreshSession(): Promise<AuthUser | null> {
  refreshing ??= send("/auth/refresh", { method: "POST" })
    .then(async (res) => (res.ok ? userFrom(await readJson(res)) : null))
    .catch(() => null)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/** Utilisateur connecté, ou null. Renouvelle silencieusement le jeton d'accès s'il a expiré. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await send("/auth/me");
    if (res.ok) return userFrom(await readJson(res));
    if (res.status === 401) return refreshSession();
    return null;
  } catch {
    return null;
  }
}

export type OAuthProvider = "google" | "github";

export const OAUTH_LABELS: Record<OAuthProvider, string> = { google: "Google", github: "GitHub" };

/** Fournisseurs dont les clés sont configurées côté API. */
export async function getOAuthProviders(): Promise<OAuthProvider[]> {
  try {
    const res = await send("/auth/oauth/providers");
    const data = await readJson(res);
    const list = data && typeof data === "object" && "providers" in data ? (data as { providers: unknown }).providers : [];
    return Array.isArray(list) ? list.filter((p): p is OAuthProvider => p === "google" || p === "github") : [];
  } catch {
    return [];
  }
}

/**
 * Adresse de départ du parcours OAuth. C'est une navigation complète (pas un fetch) :
 * l'API redirige vers Google/GitHub, qui reviennent sur l'API, qui renvoie vers /login.
 */
export function oauthStartUrl(provider: OAuthProvider, remember: boolean): string {
  return `${API_URL}/auth/oauth/${provider}?remember=${remember ? "1" : "0"}`;
}

const OAUTH_ERRORS: Record<string, string> = {
  cancelled: "Connexion annulée : l'accès n'a pas été autorisé chez le fournisseur.",
  state: "La connexion a expiré ou n'a pas pu être vérifiée. Réessayez.",
  email:
    "Ce compte ne fournit pas d'adresse e-mail vérifiée. Vérifiez votre adresse chez le fournisseur, ou créez un compte avec votre e-mail.",
  provider: "Le fournisseur de connexion n'a pas répondu correctement. Réessayez dans un instant.",
  disabled: "Ce mode de connexion n'est pas configuré sur ce serveur.",
};

/** Lit puis retire ?oauth_error=… de l'URL après un retour de Google ou GitHub. */
export function consumeOAuthError(): string | null {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("oauth_error");
  if (!code) return null;
  url.searchParams.delete("oauth_error");
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  return OAUTH_ERRORS[code] ?? OAUTH_ERRORS.provider;
}

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

/** La réponse est la même que l'adresse corresponde à un compte ou non. */
export async function requestPasswordReset(email: string): Promise<ActionResult> {
  try {
    const res = await send("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
    const data = await readJson(res);
    if (!res.ok) return { ok: false, error: errorMessage(res.status, data) };
    const message =
      data && typeof data === "object" && "message" in data ? String((data as { message: unknown }).message) : undefined;
    return { ok: true, message };
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}

/** Remplace le mot de passe ; l'API déconnecte alors tous les appareils du compte. */
export async function resetPassword(token: string, password: string): Promise<ActionResult> {
  try {
    const res = await send("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
    if (res.ok) return { ok: true };
    return { ok: false, error: errorMessage(res.status, await readJson(res)) };
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}

export async function logout(): Promise<void> {
  await send("/auth/logout", { method: "POST" }).catch(() => undefined);
}

/**
 * fetch vers l'API pour les futurs écrans (agent, projets…) : joint les cookies et,
 * sur un 401, tente un rafraîchissement puis rejoue la requête une fois.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await send(path, init);
  if (res.status !== 401) return res;
  const user = await refreshSession();
  return user ? send(path, init) : res;
}
