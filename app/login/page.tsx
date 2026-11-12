import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthCard } from "@/components/auth-card";
import { BookIcon, CodeCheckIcon, FolderIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { SimulationVisual } from "@/components/simulation-visual";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Connexion · GAMA-Copilot",
  description:
    "Connectez-vous à GAMA-Copilot, l'assistant IA qui écrit, valide et explique vos modèles multi-agents GAML.",
};

const GAMA_DOCS = "https://gama-platform.org/wiki/Home";

const features: { icon: ReactNode; title: string; text: string }[] = [
  {
    icon: <CodeCheckIcon />,
    title: "Du langage naturel au GAML validé",
    text: "Décrivez vos espèces, leurs comportements et l'expérience : le copilote écrit le modèle et le fait vérifier par gama-server avant de vous le proposer.",
  },
  {
    icon: <BookIcon />,
    title: "Des réponses tirées de la documentation",
    text: "Vos questions sur GAMA sont traitées par recherche dans la documentation officielle, pas par approximation.",
  },
  {
    icon: <FolderIcon />,
    title: "Des projets prêts à ouvrir dans GAMA",
    text: "Le copilote crée la structure du projet et les fichiers .gaml directement dans votre espace de travail.",
  },
];

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-8">
        <Logo />
        <nav aria-label="Liens utiles" className="flex items-center gap-2 sm:gap-5">
          <a
            href={GAMA_DOCS}
            target="_blank"
            rel="noreferrer"
            className="hidden text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-ink hover:underline sm:inline"
          >
            Documentation GAMA
          </a>
          <ThemeToggle />
        </nav>
      </header>

      <main className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-x-16 gap-y-12 px-4 pb-16 pt-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:grid-rows-[auto_1fr] lg:pt-12">
        <section className="lg:col-start-1 lg:row-start-1">
          <h1 className="max-w-[14ch] text-[clamp(2.4rem,6vw,4.4rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-balance text-ink">
            Modélisez. Simulez. <span className="text-accent">Comprenez.</span>
          </h1>
          <p className="mt-6 max-w-[58ch] text-[1.05rem] leading-relaxed text-muted sm:text-lg">
            GAMA-Copilot est l&apos;assistant IA de la plateforme GAMA. Expliquez le système que vous voulez étudier, il
            écrit le modèle multi-agents en GAML, le valide et répond à vos questions sur la plateforme.
          </p>
        </section>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start lg:sticky lg:top-8">
          <AuthCard />
        </div>

        <section aria-label="Ce que fait GAMA-Copilot" className="flex flex-col gap-14 lg:col-start-1 lg:row-start-2">
          <ul className="grid gap-x-8 gap-y-6 border-t border-line pt-8 md:grid-cols-3">
            {features.map((f) => (
              <li key={f.title} className="flex gap-3.5 md:flex-col md:gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-[1.25rem] text-accent">
                  {f.icon}
                </span>
                <div>
                  <h2 className="text-[0.95rem] font-semibold tracking-[-0.01em] text-ink">{f.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="pb-6 lg:pr-6">
            <SimulationVisual />
          </div>

          <p className="text-sm leading-relaxed text-muted">
            Construit sur{" "}
            <a
              href="https://gama-platform.org"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-accent"
            >
              GAMA Platform
            </a>
            , l&apos;environnement open source de modélisation et de simulation multi-agents.
          </p>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© 2026 GAMA-Copilot</span>
          <a href={GAMA_DOCS} target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-ink hover:underline">
            Documentation GAMA
          </a>
        </div>
      </footer>
    </div>
  );
}
