import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/dashboard";

export const metadata: Metadata = {
  title: "Espace de travail · GAMA-Copilot",
  description: "Discutez avec le copilote, créez et explorez vos modèles GAML.",
};

export default function HomePage() {
  return <Dashboard />;
}
