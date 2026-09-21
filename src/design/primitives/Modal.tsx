"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

import { cn } from "../cn";
import { IconButton } from "./IconButton";

export type ModalPlacement = "center" | "bottom";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  /** Already-translated. Becomes the dialog's accessible name. */
  title: string;
  description?: string;
  children?: ReactNode;
  /** Actions. On a phone these stack full-width, primary last so it sits nearest the thumb. */
  footer?: ReactNode;
  placement?: ModalPlacement;
  className?: string;
};

/**
 * Built on the native `<dialog>` element, which already does the three things a
 * hand-rolled modal gets wrong: it traps focus, it closes on Escape, and it makes
 * the rest of the page inert to assistive technology. That is a focus trap we do
 * not have to maintain, and a dependency we do not have to ship.
 *
 * `Dialog` and `Sheet` are this component with a different placement.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  placement = "center",
  className,
}: ModalProps) {
  const t = useTranslations("common");
  const ref = useRef<HTMLDialogElement>(null);
  // Generated, not a fixed string: a screen with both a Dialog and a Sheet would
  // otherwise emit the same id twice and aria-labelledby would resolve to
  // whichever came first.
  const titleId = useId();
  const descriptionId = `${titleId}-description`;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  // Escape and the backdrop both route through the native `close` event, so the
  // parent's state cannot drift out of step with what is on screen.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleClose = () => onClose();
    element.addEventListener("close", handleClose);
    return () => element.removeEventListener("close", handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // The backdrop is a pseudo-element of the dialog, so a click landing on the
      // dialog itself (rather than its content) is a backdrop click.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-0 max-h-dvh bg-transparent p-0 text-ink backdrop:bg-[rgba(20,24,36,0.45)]",
        placement === "center"
          ? "mx-auto my-auto w-[calc(100%-2rem)] max-w-md"
          : "mt-auto w-full max-w-none",
      )}
    >
      <div
        className={cn(
          "flex max-h-[90dvh] flex-col bg-surface shadow-lg",
          placement === "center" ? "rounded-lg" : "rounded-t-lg pb-[env(safe-area-inset-bottom)]",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 p-4 md:p-5">
          <div className="min-w-0">
            <h2 id={titleId} className="type-h2 text-ink">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="type-small mt-1 text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          <IconButton
            label={t("close")}
            icon={<X className="size-5" />}
            onClick={onClose}
            className="-mt-2 -mr-2"
          />
        </div>

        {children ? <div className="overflow-y-auto px-4 pb-4 md:px-5">{children}</div> : null}

        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:justify-end md:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
