import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatMinor } from "@/lib/format";

/**
 * A stat tile, not a chart. Three numbers with no trend to show would be a
 * one-bar bar chart — the number is the chart.
 *
 * The figure uses proportional digits deliberately: `tabular-nums` at display
 * size makes a number like 121 look loose, and nothing here aligns vertically.
 */
export function StatTile({
  label,
  valueMinor,
  count,
  currency = "SLE",
  hint,
  icon: Icon,
  tone,
  className,
}: {
  label: string;
  valueMinor?: number | null;
  count?: number;
  currency?: string;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  /** Colour for the icon badge only — the figure itself stays neutral. */
  tone?: string;
  className?: string;
}) {
  // Null is not zero. An average of no orders is undefined, and a zero here
  // would read as "we sold nothing" rather than "nothing to average".
  const display =
    valueMinor === null
      ? "—"
      : valueMinor !== undefined
        ? formatMinor(valueMinor, currency)
        : (count ?? 0).toLocaleString("en-GB");

  return (
    <div className={cn("bg-card ring-foreground/10 rounded-xl p-4 ring-1", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        {Icon ? (
          <span
            aria-hidden="true"
            className="bg-surface-2 grid size-9 shrink-0 place-items-center rounded-lg"
            style={tone ? { color: tone } : undefined}
          >
            <Icon className="size-[1.125rem]" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-3xl leading-none font-semibold tracking-tight">{display}</p>
      {hint ? <div className="text-muted-foreground mt-1.5 text-xs">{hint}</div> : null}
    </div>
  );
}
