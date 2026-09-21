import { AlertTriangle, CheckCircle2, Clock, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../cn";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "pending";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-sunk text-ink-muted",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  pending: "bg-primary-soft text-primary-ink",
};

/*
 * Each tone carries a default icon, so "never encode meaning in colour alone"
 * (DESIGN_SYSTEM.md §2, §8) holds by construction rather than by the caller
 * remembering. A colour-blind adviser reading an approvals list sees a tick or a
 * cross, not two identical grey pills.
 */
const ICONS: Record<BadgeTone, typeof Info | null> = {
  neutral: null,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
  pending: Clock,
};

export function ToneIcon({ tone, className }: { tone: BadgeTone; className?: string }) {
  const Icon = ICONS[tone];
  if (!Icon) return null;
  return <Icon className={className ?? "size-3.5"} aria-hidden="true" />;
}

export type BadgeProps = {
  /** The word. A badge is never an icon on its own. */
  children: ReactNode;
  tone?: BadgeTone;
  /** Overrides the tone's default icon; `null` removes it (neutral tones only). */
  icon?: ReactNode | null;
  className?: string;
};

export function Badge({ children, tone = "neutral", icon, className }: BadgeProps) {
  const resolved = icon === undefined ? <ToneIcon tone={tone} /> : icon;

  return (
    <span
      className={cn(
        "type-small inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-semibold",
        TONES[tone],
        className,
      )}
    >
      {resolved}
      {children}
    </span>
  );
}
