"use client";

import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "../cn";

export type TabItem = {
  value: string;
  /** Already-translated. */
  label: string;
  /** Optional count, e.g. pending approvals. Rendered with tabular figures. */
  count?: number;
};

export type TabsProps = {
  items: readonly TabItem[];
  /** Omit for uncontrolled use; the first item is then selected initially. */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Rendered for the selected tab only — panels are not mounted in parallel. */
  children: (value: string) => ReactNode;
  className?: string;
};

/**
 * Implements the WAI-ARIA tabs pattern by hand rather than pulling in a headless
 * UI library: arrow keys move between tabs, Home and End jump to the ends, and
 * only the selected tab is in the tab order. That is the whole of the pattern,
 * and it is less code than the adapter around a dependency would be.
 */
export function Tabs({ items, value, onValueChange, children, className }: TabsProps) {
  const base = useId();
  const [internal, setInternal] = useState(items[0]?.value ?? "");
  const selected = value ?? internal;
  const listRef = useRef<HTMLDivElement>(null);

  function select(next: string) {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();

    const index = items.findIndex((item) => item.value === selected);
    const last = items.length - 1;
    const nextIndex =
      event.key === "ArrowRight"
        ? index >= last
          ? 0
          : index + 1
        : event.key === "ArrowLeft"
          ? index <= 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : last;

    const next = items[nextIndex];
    if (!next) return;
    select(next.value);
    listRef.current?.querySelector<HTMLButtonElement>(`#${base}-tab-${next.value}`)?.focus();
  }

  return (
    <div className={className}>
      <div
        ref={listRef}
        role="tablist"
        onKeyDown={onKeyDown}
        // Tabs overflow rather than wrap or shrink: five role tabs at 360px would
        // otherwise each become an unreadable stub.
        className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
      >
        {items.map((item) => {
          const isSelected = item.value === selected;
          return (
            <button
              key={item.value}
              id={`${base}-tab-${item.value}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`${base}-panel-${item.value}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => select(item.value)}
              className={cn(
                "type-body-strong min-h-11 shrink-0 rounded-full px-4",
                "transition-colors duration-[var(--duration-feedback)] ease-[var(--ease-standard)]",
                isSelected
                  ? "bg-primary text-ink-inverse"
                  : "text-ink-muted hover:bg-surface-sunk hover:text-ink",
              )}
            >
              {item.label}
              {item.count === undefined ? null : (
                <>
                  {/* Punctuation for speech only: without it the accessible name
                      runs the count into the label ("Upcoming3"). */}
                  <span className="sr-only">, </span>
                  <span className="ml-1.5" data-numeric>
                    {item.count}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div
        id={`${base}-panel-${selected}`}
        role="tabpanel"
        aria-labelledby={`${base}-tab-${selected}`}
        tabIndex={0}
        className="pt-4"
      >
        {children(selected)}
      </div>
    </div>
  );
}
