import { formatMinor } from "@/lib/format";

/**
 * A ranked list with a proportional bar behind each row.
 *
 * Every row carries its name and value as text, so identity never rests on
 * colour alone and the light-mode contrast warning on the paler slots is
 * relieved. Bars are capped thin and the track is recessive.
 */
export function RankedBars({
  rows,
  currency,
  emptyMessage,
  colorVar = "--viz-series-1",
}: {
  rows: {
    key: string;
    label: string;
    valueMinor: number;
    secondary?: string;
    /**
     * Categorical slot, 1-based, assigned by the ENTITY — never by the row's
     * position. Rows are sorted by value, so an index-based colour would
     * repaint every category whenever the period changed and cash overtook
     * mobile money. Omit for a single-series list.
     */
    colorSlot?: number;
  }[];
  currency: string;
  emptyMessage: string;
  colorVar?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground py-6 text-center text-sm">{emptyMessage}</p>;
  }

  const max = Math.max(...rows.map((row) => row.valueMinor), 1);

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => {
        const color = row.colorSlot ? `var(--viz-series-${row.colorSlot})` : `var(${colorVar})`;

        return (
          <li key={row.key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{row.label}</span>
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {row.secondary ? <span className="mr-2">{row.secondary}</span> : null}
                {formatMinor(row.valueMinor, currency)}
              </span>
            </div>

            <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: "var(--viz-track)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(2, (row.valueMinor / max) * 100)}%`, backgroundColor: color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
