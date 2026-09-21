"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "../cn";
import { buttonClass } from "./buttonClass";
import type { ButtonSize, ButtonVariant } from "./buttonClass";
import { Spinner } from "./Spinner";

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Keeps the label visible and marks the button busy, rather than swapping the label out. */
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  className?: string;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    fullWidth = false,
    leadingIcon,
    className,
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, cn(fullWidth && "w-full", className))}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : leadingIcon}
      {children}
    </button>
  );
});
