import { cn } from "../cn";

export type SpinnerProps = {
  /** Already-translated text. Omit only when adjacent text already says what is loading. */
  label?: string;
  size?: "sm" | "md";
  className?: string;
};

/**
 * Motion is the whole point of a spinner, so it is the one component that cannot
 * honour `prefers-reduced-motion` by standing still. It slows instead, which is
 * what the preference is actually asking for.
 */
export function Spinner({ label, size = "md", className }: SpinnerProps) {
  const box = size === "sm" ? "size-4" : "size-5";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        className={cn(box, "motion-safe:animate-spin motion-reduce:animate-[spin_3s_linear_infinite]")}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      {label ? <span className="type-small">{label}</span> : null}
    </span>
  );
}
