import type { ReactNode } from "react";
import { LiveSimulation } from "./live-simulation";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

const GAMA_DOCS = "https://gama-platform.org/wiki/Home";

/**
 * Mise en page des écrans d'accès (connexion, réinitialisation) : le formulaire à gauche,
 * le panneau de démonstration (phrase → simulation → GAML) à droite.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10 lg:px-14">
        <header className="flex items-center justify-between gap-4">
          <Logo />
          <ThemeToggle />
        </header>

        <main className="flex flex-1 items-center py-12 lg:py-10">
          <div className="w-full max-w-[25rem]">{children}</div>
        </main>

        <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted">
          <a
            href={GAMA_DOCS}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            Documentation GAMA
          </a>
          <span>© 2026 GAMA-Copilot</span>
        </footer>
      </div>

      <section
        aria-labelledby="demo-title"
        className="grid gap-x-10 gap-y-8 bg-[linear-gradient(160deg,var(--panel-from),var(--panel-to))] px-5 py-12 text-panel-ink sm:px-10 lg:px-14 xl:sticky xl:top-0 xl:h-dvh xl:grid-cols-[minmax(0,1fr)_auto] xl:content-center xl:overflow-y-auto xl:px-16"
      >
        <h2 id="demo-title" className="sr-only">
          Exemple : d&apos;une phrase à un modèle GAML qui tourne
        </h2>

        <div className="order-1 xl:col-start-1 xl:row-start-1">
          <blockquote className="max-w-[22ch] font-serif text-[clamp(1.7rem,2.4vw,2.2rem)] leading-[1.18] tracking-[-0.01em] text-balance">
            « Simule une grippe qui se propage dans un campus de 300 étudiants. »
          </blockquote>
          <p className="mt-5 max-w-[42ch] text-[0.95rem] leading-relaxed text-panel-muted">
            Vous décrivez le système en une phrase. GAMA-Copilot écrit le modèle GAML, le fait vérifier par
            gama-server, puis vous le rend prêt à lancer dans GAMA.
          </p>
        </div>

        <pre className="order-3 overflow-x-auto rounded-xl border border-panel-line bg-panel-deep px-5 py-4 font-mono text-[0.75rem] leading-[1.7] text-panel-muted xl:col-start-2 xl:row-start-1 xl:self-start xl:text-[0.72rem]">
          <code>
            <K>species</K> <N>student</N> skills: [moving] {"{"}
            {"\n  "}bool infected {"<-"} flip(0.01);
            {"\n  "}bool immune {"<-"} <V>false</V>;
            {"\n  "}<K>reflex</K> move {"{"} do wander; {"}"}
            {"\n  "}<K>reflex</K> contagion when: infected {"{"}
            {"\n    "}ask student at_distance 2.0 {"{"}
            {"\n      "}if !immune and flip(0.05) {"{"} infected {"<-"} <V>true</V>; {"}"}
            {"\n    }"}
            {"\n  }"}
            {"\n  "}<K>reflex</K> heal when: infected and flip(0.01) {"{"}
            {"\n    "}infected {"<-"} <V>false</V>; immune {"<-"} <V>true</V>;
            {"\n  }"}
            {"\n}"}
          </code>
        </pre>

        <div className="order-2 xl:col-span-2 xl:row-start-2">
          <LiveSimulation />
        </div>
      </section>
    </div>
  );
}

function K({ children }: { children: ReactNode }) {
  return <span className="text-sim-s">{children}</span>;
}

function N({ children }: { children: ReactNode }) {
  return <span className="text-panel-ink">{children}</span>;
}

function V({ children }: { children: ReactNode }) {
  return <span className="text-sim-i">{children}</span>;
}
