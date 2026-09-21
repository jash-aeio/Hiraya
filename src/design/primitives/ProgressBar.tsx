import { cn } from "../cn";

export type ProgressBarProps = {
  value: number;
  max?: number;
  /** Already-translated name of what is progressing, e.g. "XP to Lingkod". */
  label: string;
  /**
   * Already-translated readout, e.g. "120 / 200 XP". Rendered as text next to the
   * bar: the fill alone is meaning carried by colour and length, which fails §8.
   */
  valueLabel?: string;
  tone?: "xp" | "primary";
  className?: string;
};

export function ProgressBar({
  value,
  max = 100,
  label,
  valueLabel,
  tone = "xp",
  className,
}: ProgressBarProps) {
  const safeMax = max > 0 ? max : 1;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percent = (clamped / safeMax) * 100;

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="type-small text-ink-muted">{label}</span>
        {valueLabel ? (
          <span className="type-small font-semibold text-ink" data-numeric>
            {valueLabel}
          </span>
        ) : null}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuetext={valueLabel}
        className="h-2.5 w-full overflow-hidden rounded-full bg-surface-sunk"
      >
        <div
          // --xp is decorative here, which is the only place it is allowed to
          // carry amber: the readout above states the value in text.
          className={cn(
            "h-full rounded-full transition-[width] duration-[var(--duration-transition)] ease-[var(--ease-standard)]",
            tone === "xp" ? "bg-xp" : "bg-primary",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
