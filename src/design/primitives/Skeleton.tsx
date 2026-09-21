import { cn } from "../cn";

export type SkeletonProps = {
  variant?: "text" | "block" | "circle";
  className?: string;
  /**
   * Already-translated. Set on the outermost skeleton of a loading region only,
   * so a screen reader hears "loading events" once rather than per grey box.
   */
  label?: string;
};

/**
 * A pulse, not a sweeping shimmer: a gradient animation across many elements is
 * measurable battery cost on the phones this is built for, for no information.
 */
export function Skeleton({ variant = "text", className, label }: SkeletonProps) {
  const shape =
    variant === "circle" ? "rounded-full" : variant === "block" ? "rounded-lg" : "rounded-sm h-4";

  return (
    <div
      className={cn("bg-surface-sunk motion-safe:animate-pulse", shape, className)}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
