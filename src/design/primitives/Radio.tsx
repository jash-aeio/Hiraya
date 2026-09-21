"use client";

import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "../cn";

export type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className" | "id"> & {
  label: ReactNode;
  id?: string;
  className?: string;
};

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, id: explicitId, className, ...rest },
  ref,
) {
  const generated = useId();
  const id = explicitId ?? generated;

  return (
    <label
      htmlFor={id}
      className={cn(
        "type-body flex min-h-11 cursor-pointer items-center gap-3 text-ink",
        className,
      )}
    >
      <input
        ref={ref}
        id={id}
        type="radio"
        className="size-5 shrink-0 appearance-none rounded-full border border-border bg-surface checked:border-6 checked:border-primary disabled:opacity-50"
        {...rest}
      />
      {label}
    </label>
  );
});

export type RadioGroupProps = {
  /** Already-translated. Rendered as the fieldset's legend. */
  legend: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

/**
 * A group of radios needs a `fieldset` and a `legend`, or a screen reader
 * announces four unrelated options with no question attached. That is the only
 * reason this component exists alongside `Radio`.
 */
export function RadioGroup({ legend, hint, error, children, className }: RadioGroupProps) {
  const id = useId();
  const messageId = `${id}-message`;

  return (
    <fieldset
      className={cn("flex flex-col gap-1", className)}
      aria-describedby={hint || error ? messageId : undefined}
      aria-invalid={error ? true : undefined}
    >
      <legend className="type-body-strong mb-1 text-ink">{legend}</legend>
      {children}
      {error ? (
        <p id={messageId} className="type-small text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="type-small text-ink-muted">
          {hint}
        </p>
      ) : null}
    </fieldset>
  );
}
