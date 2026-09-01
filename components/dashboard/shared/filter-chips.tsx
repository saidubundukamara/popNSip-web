"use client";

import { cn } from "@/lib/utils";

/**
 * One filter vocabulary for the whole dashboard. Orders, payments and the POS
 * had three near-identical copies of this, which is how a "Cash" chip ends up
 * looking one way on one screen and another way on the next.
 */
export function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

export function FilterChip({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        active ? "bg-brand-700 text-white" : "bg-surface-2 text-foreground/75 hover:bg-muted",
      )}
    >
      {children}
      {count !== undefined ? <span className="tabular-nums opacity-70">{count}</span> : null}
    </button>
  );
}
