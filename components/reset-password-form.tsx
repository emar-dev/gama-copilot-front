"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { resetPassword } from "@/lib/auth";
import { MIN_PASSWORD, Notice, PasswordVisibilityButton, PrimaryButton, TextField } from "./form-controls";
import { CheckCircleIcon, LockIcon } from "./icons";

type Field = "password" | "confirm";

const linkClass = "text-sm font-medium text-accent underline-offset-4 hover:underline";

export function ResetPasswordForm() {
  const uid = useId();
  const searchParams = useSearchParams();
  // Le jeton est lu une seule fois puis retiré de l'URL (historique, partage d'écran, captures).
  const [token] = useState(() => searchParams.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const refs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});

  useEffect(() => {
    if (token) window.history.replaceState(null, "", window.location.pathname);
  }, [token]);

  function validate(next = { password, confirm }) {
    const found: Partial<Record<Field, string>> = {};
    if (next.password.length < MIN_PASSWORD) found.password = `Choisissez au moins ${MIN_PASSWORD} caractères.`;
    if (!next.confirm) found.confirm = "Saisissez à nouveau le mot de passe.";
    else if (next.confirm !== next.password) found.confirm = "Les deux mots de passe ne correspondent pas.";
    return found;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFailure(null);
    const found = validate();
    setErrors(found);
    const first = (["password", "confirm"] as Field[]).find((f) => found[f]);
    if (first) {
      refs.current[first]?.focus();
      return;
    }
    setPending(true);
    const result = await resetPassword(token, password);
    setPending(false);
    if (result.ok) setDone(true);
    else setFailure(result.error);
  }

  if (!token) {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="font-serif text-[2rem] font-medium leading-tight text-ink">Lien incomplet</h1>
        <p className="text-[0.95rem] leading-relaxed text-muted">
          Ce lien ne contient pas de code de réinitialisation. Ouvrez le lien complet reçu par e-mail, ou demandez-en
          un nouveau depuis la page de connexion.
        </p>
        <Link href="/login" className={linkClass}>
          Aller à la page de connexion
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-start gap-4" role="status">
        <CheckCircleIcon className="text-[2rem] text-accent" />
        <div>
          <h1 className="font-serif text-[1.9rem] font-medium leading-tight text-ink">Mot de passe modifié</h1>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">
            Votre nouveau mot de passe est enregistré. Par sécurité, tous vos appareils ont été déconnectés :
            connectez-vous avec ce nouveau mot de passe.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-[linear-gradient(90deg,var(--btn-from),var(--btn-to))] px-6 text-[0.95rem] font-semibold text-white shadow-[0_10px_24px_-12px_var(--btn-to)] transition-[filter] hover:brightness-[1.06]"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-[2.1rem] font-medium leading-[1.1] tracking-[-0.015em] text-balance text-ink">
        Choisissez un nouveau mot de passe
      </h1>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">
        Une fois enregistré, il remplace l&apos;ancien et tous vos appareils sont déconnectés.
      </p>

      <form noValidate onSubmit={onSubmit} className="mt-7 flex flex-col gap-5">
        <TextField
          id={`${uid}-password`}
          label="Nouveau mot de passe"
          type={show ? "text" : "password"}
          icon={<LockIcon />}
          autoComplete="new-password"
          placeholder={`${MIN_PASSWORD} caractères minimum`}
          value={password}
          error={errors.password}
          hint={errors.password ? undefined : `Au moins ${MIN_PASSWORD} caractères.`}
          onChange={(v) => {
            setPassword(v);
            if (errors.password || errors.confirm) setErrors(validate({ password: v, confirm }));
          }}
          inputRef={(el) => {
            refs.current.password = el;
          }}
          trailing={<PasswordVisibilityButton visible={show} onToggle={() => setShow((s) => !s)} />}
        />
        <TextField
          id={`${uid}-confirm`}
          label="Confirmez le mot de passe"
          type={show ? "text" : "password"}
          icon={<LockIcon />}
          autoComplete="new-password"
          placeholder="Le même, une seconde fois"
          value={confirm}
          error={errors.confirm}
          onChange={(v) => {
            setConfirm(v);
            if (errors.confirm) setErrors(validate({ password, confirm: v }));
          }}
          inputRef={(el) => {
            refs.current.confirm = el;
          }}
        />

        {failure && <Notice tone="error">{failure}</Notice>}

        <PrimaryButton type="submit" className="mt-1" pending={pending} pendingLabel="Enregistrement…">
          Enregistrer le mot de passe
        </PrimaryButton>
      </form>

      <div className="mt-6">
        <Link href="/login" className={linkClass}>
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
