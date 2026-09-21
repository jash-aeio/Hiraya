"use client";

import { ChevronDown } from "lucide-react";
import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";

import { FieldShell, controlClass, describedBy, useFieldIds } from "./Field";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "id"> & {
  label: string;
  /** Already-translated labels. */
  options: readonly SelectOption[];
  /** Shown as a disabled first option when there is no value yet. */
  placeholder?: string;
  hint?: string;
  error?: string;
  requiredLabel?: string;
  id?: string;
  className?: string;
};

/**
 * A native `<select>`, not a custom listbox. On the budget Android phones this is
 * built for, the platform picker is faster, works offline, needs no JavaScript to
 * open, and is already accessible and translated by the OS.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    options,
    placeholder,
    hint,
    error,
    requiredLabel,
    id: explicitId,
    className,
    required,
    ...rest
  },
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
      <div className="relative">
        <select
          ref={ref}
          id={ids.id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(ids, hint, error)}
          className={controlClass(Boolean(error), `min-h-11 appearance-none pr-10 ${className ?? ""}`)}
          {...rest}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
      </div>
    </FieldShell>
  );
});
