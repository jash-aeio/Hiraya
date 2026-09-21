"use client";

import { Check } from "lucide-react";
import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "../cn";

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "className" | "id"
> & {
  /** Already-translated. */
  label: ReactNode;
  hint?: string;
  id?: string;
  className?: string;
};

/**
 * A real `<input type="checkbox">`, visually hidden behind a styled box: it keeps
 * keyboard behaviour, form submission, and the browser's own autofill and
 * validation. The whole row is the label, so the 44px target is the text too —
 * on a phone, aiming at an 18px square is the difference between a consent
 * screen that works and one an adviser fills in for the learner.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, hint, id: explicitId, className, ...rest },
  ref,
) {
  const generated = useId();
  const id = explicitId ?? generated;
  const hintId = `${id}-hint`;

  return (
    <div className={cn("flex flex-col", className)}>
      <label
        htmlFor={id}
        className="type-body flex min-h-11 cursor-pointer items-center gap-3 text-ink"
      >
        <span className="relative inline-flex shrink-0">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            aria-describedby={hint ? hintId : undefined}
            className="peer size-5 appearance-none rounded-sm border border-border bg-surface checked:border-primary checked:bg-primary disabled:opacity-50"
            {...rest}
          />
          <Check
            className="pointer-events-none absolute inset-0 m-auto size-3.5 text-ink-inverse opacity-0 peer-checked:opacity-100"
            aria-hidden="true"
          />
        </span>
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="type-small ml-8 text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
