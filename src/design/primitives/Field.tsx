"use client";

import { useId } from "react";
import type { ReactNode } from "react";

import { cn } from "../cn";

/**
 * The shared skeleton for every labelled control: label, control, then hint or
 * error. It exists so that Input, Select and Textarea cannot drift apart on the
 * one thing that matters here — that the label, the hint and the error are all
 * wired to the control by id, in both locales (DESIGN_SYSTEM.md §8).
 *
 * An error replaces the hint rather than stacking below it. Two lines of small
 * grey text under a field on a 360px screen is where people stop reading.
 */
export function useFieldIds(explicitId?: string) {
  const generated = useId();
  const id = explicitId ?? generated;
  return { id, hintId: `${id}-hint`, errorId: `${id}-error` };
}

export function describedBy(
  ids: { hintId: string; errorId: string },
  hint: ReactNode,
  error: ReactNode,
): string | undefined {
  if (error) return ids.errorId;
  if (hint) return ids.hintId;
  return undefined;
}

export const CONTROL_CLASS =
  "type-body w-full rounded-sm border bg-surface px-3 text-ink placeholder:text-ink-muted " +
  "transition-colors duration-[var(--duration-feedback)] " +
  "disabled:cursor-not-allowed disabled:bg-surface-sunk disabled:text-ink-muted";

export function controlClass(invalid: boolean, className?: string): string {
  return cn(
    CONTROL_CLASS,
    invalid ? "border-danger" : "border-border focus-visible:border-primary",
    className,
  );
}

export type FieldShellProps = {
  id: string;
  hintId: string;
  errorId: string;
  /** Already-translated. */
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Already-translated word for the required marker, e.g. "required". */
  requiredLabel?: string;
  children: ReactNode;
};

export function FieldShell({
  id,
  hintId,
  errorId,
  label,
  hint,
  error,
  required,
  requiredLabel,
  children,
}: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="type-body-strong text-ink">
        {label}
        {required ? (
          <span className="ml-1 text-danger">
            <span aria-hidden="true">*</span>
            {requiredLabel ? <span className="sr-only">{requiredLabel}</span> : null}
          </span>
        ) : null}
      </label>

      {children}

      {error ? (
        <p id={errorId} className="type-small text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="type-small text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
