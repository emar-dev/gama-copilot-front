"use client";

import { useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { AUTH_IS_MOCK, authenticate, type AuthMode } from "@/lib/auth";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeOffIcon,
  GithubIcon,
  GoogleIcon,
  InfoIcon,
  LockIcon,
  MailIcon,
  SpinnerIcon,
  UserIcon,
} from "./icons";

type Field = "name" | "email" | "password";
type Errors = Partial<Record<Field, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

function validate(mode: AuthMode, v: { name: string; email: string; password: string }): Errors {
  const errors: Errors = {};
  if (mode === "register" && v.name.trim().length < 2) {
    errors.name = "Indiquez votre nom (2 caractères minimum).";
  }
  if (!v.email.trim()) errors.email = "Saisissez votre adresse e-mail.";
  else if (!EMAIL_RE.test(v.email.trim())) errors.email = "Cette adresse e-mail n'est pas valide (ex. nom@labo.fr).";
  if (!v.password) errors.password = "Saisissez votre mot de passe.";
  else if (mode === "register" && v.password.length < MIN_PASSWORD)
    errors.password = `Choisissez au moins ${MIN_PASSWORD} caractères.`;
  return errors;
}

const TABS: { id: AuthMode; label: string }[] = [
  { id: "login", label: "Connexion" },
  { id: "register", label: "Créer un compte" },
];

export function AuthCard() {
  const uid = useId();
  const [mode, setMode] = useState<AuthMode>("login");
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const fieldRefs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});

  function switchMode(next: AuthMode) {
    setMode(next);
    setErrors({});
    setSubmitted(false);
    setNotice(null);
  }

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    switchMode(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  function update(field: Field, value: string) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    if (submitted) setErrors(validate(mode, nextValues));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    setNotice(null);
    const found = validate(mode, values);
    setErrors(found);
    const firstInvalid = (["name", "email", "password"] as Field[]).find((f) => found[f]);
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus();
      return;
    }
    setPending(true);
    const result = await authenticate(mode, {
      email: values.email.trim(),
      password: values.password,
      name: mode === "register" ? values.name.trim() : undefined,
      remember,
    });
    setPending(false);
    if (result.ok) setUser(result.user);
    else setNotice({ tone: "error", text: result.error });
  }

  function comingSoon(what: string) {
    setNotice({ tone: "info", text: `${what} n'est pas encore disponible. Utilisez votre e-mail pour l'instant.` });
  }

  if (user) {
    return (
      <CardShell>
        <div className="flex flex-col items-start gap-4 py-6" role="status">
          <CheckCircleIcon className="text-[2rem] text-accent" />
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink">
              {mode === "register" ? "Compte créé" : "Vous êtes connecté"}
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              Bienvenue {user.name}. L&apos;espace de travail du copilote arrive dans la prochaine étape.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setUser(null);
              setValues((v) => ({ ...v, password: "" }));
              setSubmitted(false);
            }}
            className="text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            Revenir au formulaire
          </button>
        </div>
      </CardShell>
    );
  }

  const isRegister = mode === "register";
  const panelId = `${uid}-panel`;

  return (
    <CardShell>
      <div role="tablist" aria-label="Mode d'accès" className="grid grid-cols-2 gap-1 rounded-xl bg-sunken p-1">
        {TABS.map((tab, i) => {
          const selected = tab.id === mode;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${uid}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => switchMode(tab.id)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-200 ${
                selected
                  ? "bg-surface text-ink shadow-[0_1px_2px_var(--shadow),0_2px_8px_-4px_var(--shadow)]"
                  : "text-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={panelId} aria-labelledby={`${uid}-tab-${mode}`} className="mt-7">
        <h2 className="text-[1.6rem] font-semibold leading-tight tracking-[-0.03em] text-balance text-ink">
          {isRegister ? "Créez votre espace" : "Bon retour parmi nous"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {isRegister
            ? "Un compte pour retrouver vos projets GAMA et l'historique de vos échanges avec le copilote."
            : "Connectez-vous pour reprendre vos modèles là où vous les avez laissés."}
        </p>

        <form noValidate onSubmit={onSubmit} className="mt-7 flex flex-col gap-5">
          {isRegister && (
            <TextField
              id={`${uid}-name`}
              label="Nom complet"
              icon={<UserIcon />}
              autoComplete="name"
              placeholder="Ada Lovelace"
              value={values.name}
              error={errors.name}
              onChange={(v) => update("name", v)}
              inputRef={(el) => {
                fieldRefs.current.name = el;
              }}
            />
          )}
          <TextField
            id={`${uid}-email`}
            label="Adresse e-mail"
            type="email"
            icon={<MailIcon />}
            autoComplete="email"
            inputMode="email"
            placeholder="nom@laboratoire.fr"
            value={values.email}
            error={errors.email}
            onChange={(v) => update("email", v)}
            inputRef={(el) => {
              fieldRefs.current.email = el;
            }}
          />
          <TextField
            id={`${uid}-password`}
            label="Mot de passe"
            type={showPassword ? "text" : "password"}
            icon={<LockIcon />}
            autoComplete={isRegister ? "new-password" : "current-password"}
            placeholder={isRegister ? `${MIN_PASSWORD} caractères minimum` : "Votre mot de passe"}
            value={values.password}
            error={errors.password}
            hint={isRegister && !errors.password ? `Au moins ${MIN_PASSWORD} caractères.` : undefined}
            onChange={(v) => update("password", v)}
            inputRef={(el) => {
              fieldRefs.current.password = el;
            }}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                aria-pressed={showPassword}
                className="grid size-9 place-items-center rounded-lg text-[1.1rem] text-muted transition-colors hover:text-ink"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            }
          />

          {!isRegister && (
            <div className="-mt-1 flex items-center justify-between gap-4 text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-muted select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="size-4 rounded border-line-strong"
                />
                Se souvenir de moi
              </label>
              <button
                type="button"
                onClick={() => comingSoon("La réinitialisation du mot de passe")}
                className="font-medium text-accent underline-offset-4 hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>
          )}

          {notice && (
            <p
              role={notice.tone === "error" ? "alert" : "status"}
              className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${
                notice.tone === "error" ? "bg-danger-soft text-danger" : "bg-sunken text-muted"
              }`}
            >
              <InfoIcon className="mt-0.5 shrink-0" />
              {notice.text}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="group mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(180deg,var(--accent),var(--accent-strong))] px-5 text-[0.95rem] font-semibold text-accent-ink shadow-[0_8px_20px_-10px_var(--accent-strong)] transition-[filter,transform,box-shadow] duration-200 hover:brightness-[1.06] active:translate-y-px disabled:cursor-wait disabled:opacity-80"
          >
            {pending ? (
              <>
                <SpinnerIcon /> {isRegister ? "Création du compte…" : "Connexion…"}
              </>
            ) : (
              <>
                {isRegister ? "Créer mon compte" : "Se connecter"}
                <ArrowRightIcon className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-muted" aria-hidden="true">
          <span className="h-px flex-1 bg-line" />
          ou
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <OAuthButton icon={<GoogleIcon />} label="Google" onClick={() => comingSoon("La connexion avec Google")} />
          <OAuthButton icon={<GithubIcon />} label="GitHub" onClick={() => comingSoon("La connexion avec GitHub")} />
        </div>

        {AUTH_IS_MOCK && (
          <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-muted">
            <InfoIcon className="mt-px shrink-0" />
            Mode démonstration : l&apos;authentification n&apos;est pas encore reliée à l&apos;API GAMA-Copilot.
          </p>
        )}
      </div>
    </CardShell>
  );
}

function CardShell({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="Accès à GAMA-Copilot"
      className="rounded-[1.4rem] border border-line bg-surface p-6 shadow-[0_1px_2px_var(--shadow),0_24px_60px_-30px_var(--shadow)] sm:p-8"
    >
      {children}
    </section>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  inputRef: (el: HTMLInputElement | null) => void;
  error?: string;
  hint?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "email" | "text";
  trailing?: ReactNode;
}

function TextField({ id, label, icon, value, onChange, inputRef, error, hint, trailing, ...rest }: TextFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div
        className={`flex h-12 items-center gap-2.5 rounded-xl border bg-canvas pl-3.5 pr-1.5 transition-[border-color,box-shadow] duration-150 focus-within:shadow-[0_0_0_3px_var(--ring)] ${
          error ? "border-danger focus-within:border-danger" : "border-line hover:border-line-strong focus-within:border-accent"
        }`}
      >
        <span className={`text-[1.1rem] ${error ? "text-danger" : "text-muted"}`}>{icon}</span>
        <input
          id={id}
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-full min-w-0 flex-1 bg-transparent text-[0.95rem] text-ink outline-none placeholder:text-placeholder"
          {...rest}
        />
        {trailing}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-[0.8rem] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[0.8rem] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function OAuthButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-canvas text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-sunken"
    >
      <span className="text-[1.05rem]">{icon}</span>
      {label}
    </button>
  );
}
