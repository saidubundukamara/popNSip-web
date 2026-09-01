"use client";

import { cn } from "@/lib/utils";
import { formatElapsed } from "@/lib/format";
import type { OrderStatus } from "@/lib/menu";
import { AGE_TARGET_MINUTES } from "@/lib/order-vocab";
import { useNow } from "@/hooks/use-now";

/**
 * The ticket ages.
 *
 * Every order card carries a rail down its left edge that fills as the order
 * sits against a target for its current status, and warms as it gets close.
 * From across a counter you can see which tickets are late without reading a
 * word — which is the whole point, because the person reading it is holding a
 * plate.
 *
 * Colour is never the only signal: `AgeLabel` prints the same information as a
 * figure, and the two always appear together on a card.
 */

type Age = { ratio: number; late: boolean; elapsedMs: number };

function useAge(placedAt: string, status: OrderStatus): Age {
  const now = useNow();
  // Before the first client tick `now` is 0, which would read as a negative
  // age; fall back to the parsed timestamp so SSR renders an empty rail
  // rather than a full one.
  const elapsedMs = now === 0 ? 0 : Math.max(0, now - new Date(placedAt).getTime());
  const targetMinutes = AGE_TARGET_MINUTES[status];
  if (!targetMinutes) return { ratio: 0, late: false, elapsedMs };

  const ratio = elapsedMs / (targetMinutes * 60_000);
  return { ratio, late: ratio > 1, elapsedMs };
}

function toneOf(ratio: number): string {
  if (ratio > 1) return "var(--age-late)";
  if (ratio > 0.6) return "var(--age-warn)";
  return "var(--age-ok)";
}

export function AgeRail({
  placedAt,
  status,
  className,
}: {
  placedAt: string;
  status: OrderStatus;
  className?: string;
}) {
  const { ratio, late, elapsedMs } = useAge(placedAt, status);
  const fill = Math.min(1, ratio);

  return (
    <div
      className={cn("bg-surface-2 relative w-1.5 shrink-0 overflow-hidden rounded-full", className)}
      role="img"
      aria-label={`Waiting ${formatElapsed(elapsedMs)}${late ? ", over target" : ""}`}
    >
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 rounded-full transition-[height] duration-500 ease-out",
          late && "throb",
        )}
        style={{ height: `${fill * 100}%`, background: toneOf(ratio) }}
      />
    </div>
  );
}

/** The rail's figure. Always rendered beside a rail, never instead of one. */
export function AgeLabel({
  placedAt,
  status,
  className,
}: {
  placedAt: string;
  status: OrderStatus;
  className?: string;
}) {
  const { ratio, elapsedMs } = useAge(placedAt, status);

  return (
    <span
      className={cn("font-semibold tabular-nums", className)}
      style={{ color: ratio > 0.6 ? toneOf(ratio) : undefined }}
    >
      {formatElapsed(elapsedMs)}
    </span>
  );
}
