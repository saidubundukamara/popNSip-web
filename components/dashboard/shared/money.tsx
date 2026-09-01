import { cn } from "@/lib/utils";
import { formatDelta, formatMinor } from "@/lib/format";

/**
 * Money that sits in a column or ticks while you watch it. Tabular figures
 * keep "Le 8,450,000" from shifting under its own label when the last digit
 * changes — Leone amounts are long enough that proportional digits visibly
 * jitter.
 *
 * The hero figure on an analytics tile deliberately does *not* use this: it
 * never ticks, and proportional digits set it better.
 */
export function Money({
  minor,
  currency = "SLE",
  signed = false,
  className,
}: {
  minor: number;
  currency?: string;
  signed?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums", className)}>
      {signed ? formatDelta(minor, currency) : formatMinor(minor, currency)}
    </span>
  );
}
