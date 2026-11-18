"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import {
  authenticate,
  consumeOAuthError,
  getCurrentUser,
  getOAuthProviders,
  OAUTH_LABELS,
  oauthStartUrl,
  requestPasswordReset,
  type AuthMode,
  type OAuthProvider,
} from "@/lib/auth";
import {
  EMAIL_RE,
  MIN_PASSWORD,
  Notice,
  PasswordVisibilityButton,
  PrimaryButton,
  TextField,
} from "./form-controls";
import { GithubIcon, GoogleIcon, LockIcon, MailIcon, SpinnerIcon, UserIcon } from "./icons";

type Field = "name" | "email" | "password";
type Errors = Partial<Record<Field, string>>;

function emailError(email: string): string | undefined {
  if (!email.trim()) return "Saisissez votre adresse e-mail.";
  if (!EMAIL_RE.test(email.trim())) return "Cette adresse e-mail n'est pas valide (ex. nom@labo.fr).";
  return undefined;
}

function validate(mode: AuthMode, v: { name: string; email: string; password: string }): Errors {
  const errors: Errors = {};
  if (mode === "register" && v.name.trim().length < 2) {
    errors.name = "Indiquez votre nom (2 caractères minimum).";
  }
  errors.email = emailError(v.email);
  if (!v.password) errors.password = "Saisissez votre mot de passe.";
  else if (mode === "register" && v.password.length < MIN_PASSWORD)
    errors.password = `Choisissez au moins ${MIN_PASSWORD} caractères.`;
  if (!errors.email) delete errors.email;
  return errors;
}

const TABS: { id: AuthMode; label: string }[] = [
  { id: "login", label: "Connexion" },
  { id: "register", label: "Créer un compte" },
];

export function AuthCard() {
  const router = useRouter();
  const uid = useId();
  const [mode, setMode] = useState<AuthMode>("login");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [redirecting, setRedirecting] = useState<OAuthProvider | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const fieldRefs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});

  // Déjà connecté (cookie de session valide) : on l'affiche au lieu du formulaire.
  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then((current) => {
      // Déjà connecté : direction l'espace de travail.
      if (!cancelled && current) router.replace("/");
    });
    // Fournisseurs OAuth disponibles, et éventuelle erreur au retour de Google / GitHub.
    getOAuthProviders().then((list) => {
      if (cancelled) return;
      setProviders(list);
      const oauthError = consumeOAuthError();
      if (oauthError) setNotice({ tone: "error", text: oauthError });
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Retour arrière depuis Google/GitHub : la page sort du cache (bfcache) avec les boutons bloqués.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setRedirecting(null);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

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
    if (result.ok) router.replace("/");
    else setNotice({ tone: "error", text: result.error });
  }

  function continueWith(provider: OAuthProvider) {
    if (!providers.includes(provider)) {
      setNotice({
        tone: "info",
        text: `La connexion avec ${OAUTH_LABELS[provider]} n'est pas configurée sur ce serveur. Utilisez votre e-mail.`,
      });
      return;
    }
    setNotice(null);
    setRedirecting(provider);
    window.location.assign(oauthStartUrl(provider, remember));
  }

  function openForgot() {
    setForgotOpen(true);
    setNotice(null);
    setErrors({});
  }

  function closeForgot() {
    setForgotOpen(false);
    setNotice(null);
    setErrors({});
  }

  if (forgotOpen) {
    return (
      <CardShell>
        <ForgotPasswordForm
          initialEmail={values.email}
          onEmailChange={(email) => setValues((v) => ({ ...v, email }))}
          onBack={closeForgot}
        />
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
                  ? "bg-accent text-accent-ink shadow-[0_4px_12px_-6px_var(--accent)]"
                  : "text-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={panelId} aria-labelledby={`${uid}-tab-${mode}`} className="mt-9">
        <h1 className="font-serif text-[2.1rem] font-medium leading-[1.1] tracking-[-0.015em] text-balance text-ink">
          {isRegister ? "Créez votre espace de modélisation" : "Reprenez vos modèles"}
        </h1>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">
          {isRegister
            ? "Vos projets GAMA et vos échanges avec le copilote seront enregistrés dans ce compte."
            : "Vos projets GAMA et vos échanges avec le copilote vous attendent là où vous les avez laissés."}
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
            trailing={<PasswordVisibilityButton visible={showPassword} onToggle={() => setShowPassword((s) => !s)} />}
          />

          {!isRegister && (
            <div className="-mt-1 flex items-center justify-between gap-4 text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-muted select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="size-4 rounded border-field"
                />
                Se souvenir de moi
              </label>
              <button
                type="button"
                onClick={openForgot}
                className="font-medium text-accent underline-offset-4 hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>
          )}

          {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

          <PrimaryButton
            type="submit"
            className="mt-1"
            pending={pending}
            pendingLabel={isRegister ? "Création du compte…" : "Connexion…"}
          >
            {isRegister ? "Créer mon compte" : "Se connecter"}
          </PrimaryButton>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-muted" aria-hidden="true">
          <span className="h-px flex-1 bg-line" />
          ou
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <OAuthButton
            icon={<GoogleIcon />}
            label="Google"
            pending={redirecting === "google"}
            disabled={redirecting !== null}
            onClick={() => continueWith("google")}
          />
          <OAuthButton
            icon={<GithubIcon />}
            label="GitHub"
            pending={redirecting === "github"}
            disabled={redirecting !== null}
            onClick={() => continueWith("github")}
          />
        </div>
      </div>
    </CardShell>
  );
}

function ForgotPasswordForm({
  initialEmail,
  onEmailChange,
  onBack,
}: {
  initialEmail: string;
  onEmailChange: (email: string) => void;
  onBack: () => void;
}) {
  const uid = useId();
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const invalid = emailError(email);
    setError(invalid);
    setNotice(null);
    if (invalid) {
      emailRef.current?.focus();
      return;
    }
    setPending(true);
    const result = await requestPasswordReset(email.trim());
    setPending(false);
    if (result.ok) setSentTo(email.trim());
    else setNotice({ tone: "error", text: result.error });
  }

  const backButton = (
    <button
      type="button"
      onClick={onBack}
      className="text-sm font-medium text-accent underline-offset-4 hover:underline"
    >
      Retour à la connexion
    </button>
  );

  if (sentTo) {
    return (
      <div className="flex flex-col items-start gap-4" role="status">
        <MailIcon className="text-[2rem] text-accent" />
        <div>
          <h1 className="font-serif text-[1.9rem] font-medium leading-tight text-ink">Vérifiez votre boîte mail</h1>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">
            Si un compte existe pour <span className="font-medium text-ink">{sentTo}</span>, un lien pour choisir un
            nouveau mot de passe vient de lui être envoyé. Ce lien expire au bout de quelques minutes et ne sert
            qu&apos;une fois.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Rien reçu après quelques minutes ? Regardez dans les indésirables, ou{" "}
            <button
              type="button"
              onClick={() => setSentTo(null)}
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              renvoyez le lien
            </button>
            .
          </p>
        </div>
        {backButton}
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-[2.1rem] font-medium leading-[1.1] tracking-[-0.015em] text-balance text-ink">
        Mot de passe oublié
      </h1>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">
        Indiquez l&apos;adresse de votre compte : nous vous enverrons un lien pour choisir un nouveau mot de passe.
      </p>
      <form noValidate onSubmit={onSubmit} className="mt-7 flex flex-col gap-5">
        <TextField
          id={`${uid}-email`}
          label="Adresse e-mail"
          type="email"
          icon={<MailIcon />}
          autoComplete="email"
          inputMode="email"
          placeholder="nom@laboratoire.fr"
          value={email}
          error={error}
          onChange={(v) => {
            setEmail(v);
            onEmailChange(v);
            if (error) setError(emailError(v));
          }}
          inputRef={(el) => {
            emailRef.current = el;
          }}
        />
        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
        <PrimaryButton type="submit" pending={pending} pendingLabel="Envoi du lien…">
          Envoyer le lien
        </PrimaryButton>
      </form>
      <div className="mt-6">{backButton}</div>
    </div>
  );
}

function CardShell({ children }: { children: ReactNode }) {
  return <section aria-label="Accès à GAMA-Copilot">{children}</section>;
}

function OAuthButton({
  icon,
  label,
  pending,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  pending: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={pending}
      aria-label={`Continuer avec ${label}`}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-sunken disabled:cursor-wait disabled:opacity-70"
    >
      <span className="text-[1.05rem]">{pending ? <SpinnerIcon /> : icon}</span>
      {label}
    </button>
  );
}
