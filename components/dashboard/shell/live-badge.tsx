"use client";

import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/format";
import { useOrderAlerts } from "@/components/dashboard/shell/order-alerts";

/**
 * Freshness, stated plainly. The polling fallback is meant to be invisible in
 * effect but not in fact — if the stream is down, whoever is working the
 * counter should know the board may be up to ten seconds behind before they
 * act on it.
 */
export function LiveBadge({ className }: { className?: string }) {
  const { mode, lastEventAt } = useOrderAlerts();

  const copy = {
    live: { dot: "bg-age-ok", text: "Live" },
    polling: { dot: "bg-age-warn", text: "Checking every 10s" },
    connecting: { dot: "bg-muted-foreground", text: "Connecting…" },
  }[mode];

  return (
    <span
      className={cn("text-muted-foreground flex items-center gap-2 text-xs", className)}
      role="status"
    >
      <span
        aria-hidden="true"
        className={cn("size-2 shrink-0 rounded-full", copy.dot, mode !== "live" && "throb")}
      />
      <span className="whitespace-nowrap">
        {copy.text}
        {lastEventAt ? (
          <span className="hidden md:inline"> · {formatClock(lastEventAt)}</span>
        ) : null}
      </span>
    </span>
  );
}
