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
}: {
  label: string;
  valueMinor?: number | null;
  count?: number;
  currency?: string;
  hint?: string;
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
    <div className="bg-card rounded-lg border p-4">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="mt-1 text-3xl leading-none font-semibold tracking-tight">{display}</p>
      {hint ? <p className="text-muted-foreground mt-1.5 text-xs">{hint}</p> : null}
    </div>
  );
}
