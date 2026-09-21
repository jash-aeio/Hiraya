import type { ReactNode } from "react";

import { cn } from "../cn";

export type CardProps = {
  children: ReactNode;
  /** `flat` for dense staff tables where a shadow per row becomes noise. */
  elevation?: "sm" | "md" | "flat";
  padding?: "none" | "md";
  className?: string;
};

/** White card on the cool-grey canvas, 16px radius — the reference's signature shape. */
export function Card({ children, elevation = "sm", padding = "md", className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg bg-surface",
        elevation === "sm" && "shadow-sm",
        elevation === "md" && "shadow-md",
        elevation === "flat" && "border border-border",
        // 16px on mobile, 20px from md (DESIGN_SYSTEM.md §4).
        padding === "md" && "p-4 md:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type CardHeaderProps = {
  title: ReactNode;
  /** Small-caps section label above the title, as in the reference. */
  label?: ReactNode;
  description?: ReactNode;
  /** A single action, right-aligned. More than one belongs in a footer. */
  action?: ReactNode;
  /** Heading level. Screens have exactly one h1, so cards usually want h2 or h3. */
  as?: "h2" | "h3";
};

export function CardHeader({ title, label, description, action, as = "h2" }: CardHeaderProps) {
  const Heading = as;

  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {label ? <p className="type-label mb-1 text-ink-muted">{label}</p> : null}
        <Heading className={cn(as === "h2" ? "type-h2" : "type-h3", "text-ink")}>{title}</Heading>
        {description ? <p className="type-small mt-1 text-ink-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4", className)}>
      {children}
    </div>
  );
}
