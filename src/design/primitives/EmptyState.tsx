import type { ReactNode } from "react";

import { cn } from "../cn";

export type EmptyStateProps = {
  /** Already-translated. */
  title: string;
  description?: string;
  /**
   * Learner surfaces pass an illustration; staff surfaces pass an icon or
   * nothing at all (D12 — no mascots on an adviser screen).
   */
  art?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, art, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-10 text-center", className)}>
      {art ? (
        <div className="mb-4 text-primary" aria-hidden="true">
          {art}
        </div>
      ) : null}
      <p className="type-h3 text-ink">{title}</p>
      {description ? (
        <p className="type-body mt-1.5 max-w-prose text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
