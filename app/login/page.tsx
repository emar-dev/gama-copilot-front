import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = {
  title: "Connexion à GAMA-Copilot",
  description:
    "Connectez-vous à GAMA-Copilot, l'assistant IA qui écrit, valide et explique vos modèles multi-agents GAML.",
};

export default function LoginPage() {
  return (
    <AuthShell>
      <AuthCard />
    </AuthShell>
  );
}
