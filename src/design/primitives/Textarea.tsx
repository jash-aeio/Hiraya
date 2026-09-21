"use client";

import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

import { FieldShell, controlClass, describedBy, useFieldIds } from "./Field";

export type TextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "className" | "id"
> & {
  label: string;
  hint?: string;
  error?: string;
  requiredLabel?: string;
  id?: string;
  className?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, requiredLabel, id: explicitId, className, required, rows = 4, ...rest },
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
      <textarea
        ref={ref}
        id={ids.id}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, hint, error)}
        className={controlClass(Boolean(error), `py-2.5 ${className ?? ""}`)}
        {...rest}
      />
    </FieldShell>
  );
});
