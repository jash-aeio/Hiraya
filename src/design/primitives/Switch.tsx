"use client";

import { useId } from "react";

import { cn } from "../cn";

export type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Already-translated. */
  label: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * `role="switch"` on a button rather than a checkbox, because the two are
 * different promises: a switch takes effect immediately, a checkbox takes effect
 * when the form is submitted. Use this only for the former — a learner toggling
 * their leaderboard visibility, an admin enabling a module.
 */
export function Switch({ checked, onChange, label, hint, disabled, className }: SwitchProps) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <span className="flex flex-col">
        <span id={id} className="type-body text-ink">
          {label}
        </span>
        {hint ? (
          <span id={hintId} className="type-small text-ink-muted">
            {hint}
          </span>
        ) : null}
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        aria-describedby={hint ? hintId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        // The button is 44px tall even though the track it draws is 28px: the
        // target is the reachable area, not the artwork (DESIGN_SYSTEM.md §7).
        className={cn(
          "relative inline-flex h-11 w-12 shrink-0 items-center justify-center",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <span
          className={cn(
            "h-7 w-12 rounded-full",
            "transition-colors duration-[var(--duration-feedback)] ease-[var(--ease-standard)]",
            checked ? "bg-primary" : "border border-border bg-surface-sunk",
          )}
          aria-hidden="true"
        />
        <span
          className={cn(
            "absolute size-5 rounded-full bg-surface shadow-sm",
            "transition-[left] duration-[var(--duration-feedback)] ease-[var(--ease-standard)]",
            checked ? "left-6" : "left-1",
          )}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
