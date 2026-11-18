"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { EyeIcon, EyeOffIcon, InfoIcon, SpinnerIcon } from "./icons";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD = 8;

interface TextFieldProps {
  id: string;
  label: string;
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  inputRef?: (el: HTMLInputElement | null) => void;
  error?: string;
  hint?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "email" | "text";
  trailing?: ReactNode;
}

export function TextField({ id, label, icon, value, onChange, inputRef, error, hint, trailing, ...rest }: TextFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div
        className={`flex h-12 items-center gap-2.5 rounded-xl border bg-surface pl-3.5 pr-1.5 transition-[border-color,box-shadow] duration-150 focus-within:shadow-[0_0_0_3px_var(--ring)] ${
          error ? "border-danger focus-within:border-danger" : "border-field hover:border-muted focus-within:border-accent"
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

export function PasswordVisibilityButton({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      aria-pressed={visible}
      className="grid size-9 place-items-center rounded-lg text-[1.1rem] text-muted transition-colors hover:text-ink"
    >
      {visible ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );
}

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pending?: boolean;
  pendingLabel?: string;
}

export function PrimaryButton({ pending, pendingLabel, children, className = "", ...rest }: PrimaryButtonProps) {
  return (
    <button
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,var(--btn-from),var(--btn-to))] px-5 text-[0.95rem] font-semibold text-white shadow-[0_10px_24px_-12px_var(--btn-to)] transition-[filter,transform,box-shadow] duration-200 hover:brightness-[1.06] active:translate-y-px disabled:cursor-wait disabled:opacity-80 ${className}`}
      {...rest}
    >
      {pending ? (
        <>
          <SpinnerIcon /> {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function Notice({ tone, children }: { tone: "info" | "error"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${
        tone === "error" ? "bg-danger-soft text-danger" : "bg-sunken text-muted"
      }`}
    >
      <InfoIcon className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
