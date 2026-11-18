import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata: Metadata = {
  title: "Nouveau mot de passe · GAMA-Copilot",
  description: "Choisissez un nouveau mot de passe pour votre compte GAMA-Copilot.",
  // Le jeton est dans l'URL : il ne doit fuiter ni par l'en-tête Referer ni dans les moteurs de recherche.
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense fallback={<p className="text-sm text-muted">Chargement…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
