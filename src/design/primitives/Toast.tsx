"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "../cn";
import { ToneIcon } from "./Badge";
import type { BadgeTone } from "./Badge";
import { IconButton } from "./IconButton";

export type ToastTone = Extract<BadgeTone, "success" | "warning" | "danger" | "info">;

export type ToastInput = {
  /** Already-translated. */
  message: string;
  tone?: ToastTone;
  /** Milliseconds. `0` keeps it until dismissed — use that for anything unresolved. */
  duration?: number;
};

type Toast = ToastInput & { id: number };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

/* Colour is the secondary signal here: the icon and the message carry it (§8). */
const TONE_INK: Record<ToastTone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
};

/** Wrap the app once. Lives inside NextIntlClientProvider so the dismiss label translates. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  const [toasts, setToasts] = useState<readonly Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (input: ToastInput) => {
      const id = Date.now() + Math.random();
      // Three at once, oldest dropped. A stack taller than that covers the screen
      // it is reporting on, and on the scanner it would cover the camera.
      setToasts((current) => [...current.slice(-2), { ...input, id }]);

      const duration = input.duration ?? 5000;
      if (duration > 0) window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        // Errors interrupt; everything else waits for a pause in speech.
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col gap-2 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "danger" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto mx-auto flex w-full max-w-md items-center justify-between gap-3",
              "rounded-md bg-surface p-3 shadow-lg",
            )}
          >
            <p className="type-body flex min-w-0 items-center gap-2 text-ink">
              <ToneIcon tone={toast.tone ?? "info"} className={cn("size-4 shrink-0", TONE_INK[toast.tone ?? "info"])} />
              {toast.message}
            </p>
            <IconButton
              label={t("dismiss")}
              icon={<X className="size-4" />}
              onClick={() => dismiss(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): (toast: ToastInput) => void {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside a ToastProvider.");
  return show;
}
