export type AuthMode = "login" | "register";

export interface AuthPayload {
  email: string;
  password: string;
  name?: string;
  remember?: boolean;
}

export type AuthResult =
  | { ok: true; user: { email: string; name: string } }
  | { ok: false; error: string };

/**
 * L'API NestJS (gama-copilot-api) n'expose pas encore de routes d'authentification.
 * Tant que c'est le cas, `authenticate` simule la réponse côté client.
 * Pour brancher le vrai backend : passer AUTH_IS_MOCK à false et implémenter
 * POST /auth/login et POST /auth/register côté API.
 */
export const AUTH_IS_MOCK = true;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export async function authenticate(
  mode: AuthMode,
  payload: AuthPayload,
): Promise<AuthResult> {
  if (AUTH_IS_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    const name = payload.name?.trim() || payload.email.split("@")[0];
    return { ok: true, user: { email: payload.email, name } };
  }

  try {
    const res = await fetch(`${API_URL}/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        data && typeof data === "object" && "message" in data
          ? String((data as { message: unknown }).message)
          : "Identifiants refusés par le serveur.";
      return { ok: false, error: message };
    }
    return { ok: true, user: (data as { user: { email: string; name: string } }).user };
  } catch {
    return {
      ok: false,
      error: "Impossible de joindre l'API GAMA-Copilot. Vérifiez qu'elle tourne puis réessayez.",
    };
  }
}
