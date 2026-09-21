"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "../cn";

export type IconButtonVariant = "ghost" | "secondary" | "danger";

const VARIANTS: Record<IconButtonVariant, string> = {
  ghost: "text-ink-muted hover:bg-surface-sunk hover:text-ink",
  secondary: "border border-border bg-surface text-ink hover:bg-surface-sunk",
  danger: "text-danger hover:bg-danger-soft",
};

export type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "aria-label"
> & {
  /** Required and already translated: an icon alone is not a name. */
  label: string;
  icon: ReactNode;
  variant?: IconButtonVariant;
  className?: string;
};

/**
 * `label` is a required prop rather than an optional `aria-label`, because the
 * failure it prevents — an unlabelled control in the accessibility tree — is
 * invisible on screen and caught only by an audit nobody has run yet.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = "ghost", className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "touch-target inline-flex items-center justify-center rounded-full",
        "transition-colors duration-[var(--duration-feedback)] ease-[var(--ease-standard)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      <span aria-hidden="true" className="inline-flex">
        {icon}
      </span>
    </button>
  );
});
