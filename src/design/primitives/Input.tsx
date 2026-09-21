"use client";

import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

import { FieldShell, controlClass, describedBy, useFieldIds } from "./Field";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id"> & {
  /** Already-translated. Required: a placeholder is not a label. */
  label: string;
  hint?: string;
  error?: string;
  requiredLabel?: string;
  id?: string;
  className?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, requiredLabel, id: explicitId, className, required, type = "text", ...rest },
  ref,
) {
  const ids = useFieldIds(explicitId);

  return (
    <FieldShell
      {...ids}
      label={label}
      hint={hint}
      error={error}
      required={required}
      requiredLabel={requiredLabel}
    >
      <input
        ref={ref}
        id={ids.id}
        type={type}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, hint, error)}
        className={controlClass(Boolean(error), `min-h-11 ${className ?? ""}`)}
        {...rest}
      />
    </FieldShell>
  );
});
