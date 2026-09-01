"use client";

import * as React from "react";
import { Coffee, Inbox } from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { FilterChip } from "@/components/dashboard/shared/filter-chips";
import { OrderCard } from "@/components/dashboard/queue/order-card";
import { useOrderAlerts } from "@/components/dashboard/shell/order-alerts";
import { STATUS_META, TONE_TEXT } from "@/lib/order-vocab";
import type { OrderStatus, StaffOrder } from "@/lib/menu";

/**
 * The live board.
 *
 * The version this replaces filtered out empty status groups, so advancing an
 * order could make a whole column vanish and every card on screen jump. The
 * card you had just tapped ended up somewhere else, and a full queue refetch
 * redrew the board underneath it. That destroys the spatial memory a cashier
 * relies on to work without reading.
 *
 * So: **lanes never move.** Every lane renders whether or not it holds
 * anything, in the order work flows through them, and a transition patches one
 * order in place rather than refetching thirty.
 */
export function QueueBoard({
  lanes,
  emptyTitle,
  emptyHint,
  compact = false,
  filter,
}: {
  lanes: OrderStatus[];
  emptyTitle: string;
  emptyHint: string;
  compact?: boolean;
  filter?: (order: StaffOrder) => boolean;
}) {
  const { orders, patch, refresh, acknowledge } = useOrderAlerts();
  const [lane, setLane] = React.useState<OrderStatus | "ALL">("ALL");

  // Arriving on the board is the acknowledgement — the repeating alert has
  // done its job once someone is looking at the thing it was pointing at.
  React.useEffect(() => {
    acknowledge();
  }, [acknowledge]);

  if (orders === null) return <BoardSkeleton lanes={lanes} />;

  const visible = filter ? orders.filter(filter) : orders;
  const byLane = new Map<OrderStatus, StaffOrder[]>(
    lanes.map((status) => [status, []]),
  );
  for (const order of visible) {
    byLane.get(order.status)?.push(order);
  }

  const total = lanes.reduce(
    (count, status) => count + (byLane.get(status)?.length ?? 0),
    0,
  );

  if (total === 0) {
    return (
      <div className="bg-card ring-foreground/10 rounded-xl ring-1">
        <EmptyState icon={Coffee} title={emptyTitle} hint={emptyHint} />
      </div>
    );
  }

  const shown = lane === "ALL" ? lanes : [lane];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Phones cannot show seven lanes side by side, and a seven-deep scroll
          is worse than a filter. Tablets and up show every lane at once. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden">
        <FilterChip
          active={lane === "ALL"}
          onClick={() => setLane("ALL")}
          count={total}
        >
          All
        </FilterChip>
        {lanes.map((status) => (
          <FilterChip
            key={status}
            active={lane === status}
            onClick={() => setLane(status)}
            count={byLane.get(status)?.length ?? 0}
          >
            {STATUS_META[status].label}
          </FilterChip>
        ))}
      </div>

      {/* `contain-paint` is load-bearing, not decoration: without it this
          board's full content width reaches the document's scroll extent and
          the whole page gains a sideways scrollbar into empty space, even
          though the board itself scrolls correctly. See globals.css. */}
      <div className="md:contain-paint md:h-[calc(100dvh-13rem)] md:min-h-96 md:overflow-x-auto">
        <div
          className={cn(
            "grid gap-4",
            "md:h-full md:w-max md:auto-cols-[17.5rem] md:grid-flow-col",
          )}
        >
          {shown.map((status) => {
            const laneOrders = byLane.get(status) ?? [];
            const meta = STATUS_META[status];

            return (
              <section
                key={status}
                className="flex min-w-0 flex-col md:min-h-0"
                aria-label={meta.label}
              >
                <header className="flex items-center justify-between gap-2 pb-2">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <meta.icon
                      className={cn("size-4", TONE_TEXT[meta.tone])}
                      aria-hidden="true"
                    />
                    {meta.label}
                  </h2>
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {laneOrders.length}
                  </span>
                </header>

                <div className="flex flex-col gap-3 md:min-h-0 md:flex-1 md:overflow-y-auto md:pr-1 md:pb-1">
                  {laneOrders.length === 0 ? (
                    <div className="border-border rounded-xl border border-dashed">
                      <EmptyState size="sm" icon={Inbox} title="Nothing here" />
                    </div>
                  ) : (
                    laneOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        compact={compact}
                        onPatched={patch}
                        onFailed={refresh}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BoardSkeleton({ lanes }: { lanes: OrderStatus[] }) {
  return (
    <div className="grid gap-4 md:auto-cols-[minmax(19rem,1fr)] md:grid-flow-col">
      {lanes.slice(0, 4).map((status) => (
        <div key={status} className="flex flex-col gap-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
