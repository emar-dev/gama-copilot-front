"use client";

import { MoonIcon, SunIcon } from "./icons";

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* stockage indisponible (navigation privée) : le thème reste pour la session */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Basculer entre thème clair et sombre"
      title="Thème clair / sombre"
      className="grid size-10 place-items-center rounded-full border border-line bg-surface text-[1.15rem] text-muted transition-colors hover:border-line-strong hover:text-ink"
    >
      <SunIcon className="theme-icon-sun" />
      <MoonIcon className="theme-icon-moon" />
    </button>
  );
}
