"use client";

import Link from "next/link";
import { ArrowRight, ChefHat, CircleDollarSign, ListOrdered, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/dashboard/analytics/stat-tile";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Money } from "@/components/dashboard/shared/money";
import { StatusChip } from "@/components/dashboard/shared/status-chip";
import { AgeLabel } from "@/components/dashboard/shared/age-rail";
import { useOrderAlerts } from "@/components/dashboard/shell/order-alerts";
import { balanceDueOf, OPEN_LANES, TYPE_LABELS } from "@/lib/order-vocab";
import type { AnalyticsOverview } from "@/lib/menu";

/**
 * What is happening right now, above what happened today.
 *
 * The screen this replaces listed three cards reading "Phase 3 / Phase 4 /
 * Phase 5" and told whoever signed in that the queue was still to come. All
 * three phases had shipped. Live counts come from the shell's feed, so this
 * page moves as the shift does without a refresh.
 */
export function TodayView({ overview }: { overview: AnalyticsOverview | null }) {
  const { orders } = useOrderAlerts();

  const open = orders ?? [];
  const waiting = open.filter((order) => OPEN_LANES.includes(order.status));
  const unpaid = open.filter((order) => balanceDueOf(order) > 0);
  const unpaidMinor = unpaid.reduce((total, order) => total + balanceDueOf(order), 0);
  const cooking = open.filter((order) => order.status === "PREPARING").length;
  const ready = open.filter((order) => order.status === "READY").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Waiting now"
          count={waiting.length}
          icon={ListOrdered}
          tone="var(--brand-700)"
          hint={
            waiting.length === 0
              ? "The counter is clear."
              : `${cooking} cooking · ${ready} ready to collect`
          }
        />
        <StatTile
          label="Not paid yet"
          valueMinor={unpaidMinor}
          icon={TriangleAlert}
          tone="var(--st-unpaid)"
          hint={
            unpaid.length === 0
              ? "Everything on the board is settled."
              : `Across ${unpaid.length} ${unpaid.length === 1 ? "order" : "orders"}`
          }
        />
        <StatTile
          label="Taken today"
          valueMinor={overview?.summary.revenueMinor ?? 0}
          icon={CircleDollarSign}
          tone="var(--age-ok)"
          hint="Finished orders only"
        />
        <StatTile
          label="Orders today"
          count={overview?.summary.orderCount ?? 0}
          icon={ChefHat}
          tone="var(--st-preparing)"
          hint={
            overview?.summary.averageOrderValueMinor == null ? (
              "No average yet"
            ) : (
              <>
                <Money minor={overview.summary.averageOrderValueMinor} /> on average
              </>
            )
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <section className="bg-card ring-foreground/10 flex flex-col rounded-xl ring-1">
          <header className="flex items-center justify-between gap-3 p-4 pb-2">
            <h2 className="font-semibold">On the counter</h2>
            <Button size="sm" variant="ghost" asChild>
              <Link href="/dashboard/queue">
                Open the queue
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </header>

          {waiting.length === 0 ? (
            <EmptyState
              icon={ListOrdered}
              title="Nothing waiting"
              hint="New orders arrive here on their own — you do not need to refresh."
            />
          ) : (
            <ul className="divide-border divide-y">
              {waiting.slice(0, 6).map((order) => {
                const due = balanceDueOf(order);
                return (
                  <li key={order.id}>
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="hover:bg-muted flex items-center gap-3 px-4 py-3 transition-colors"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{order.reference}</span>
                        <span className="text-muted-foreground block truncate text-sm">
                          {TYPE_LABELS[order.type]}
                          {order.customer?.name ? ` · ${order.customer.name}` : ""}
                        </span>
                      </span>
                      <StatusChip
                        status={order.status}
                        size="sm"
                        className="hidden sm:inline-flex"
                      />
                      <span className="w-24 shrink-0 text-right">
                        <Money
                          minor={order.totalMinor}
                          currency={order.currency}
                          className="block text-sm font-semibold"
                        />
                        {due > 0 ? (
                          <span className="text-st-unpaid text-xs font-semibold">Not paid</span>
                        ) : null}
                      </span>
                      <AgeLabel
                        placedAt={order.placedAt}
                        status={order.status}
                        className="text-muted-foreground w-16 shrink-0 text-right text-sm whitespace-nowrap"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="bg-card ring-foreground/10 flex flex-col rounded-xl ring-1">
          <header className="flex items-center justify-between gap-3 p-4 pb-2">
            <h2 className="font-semibold">Selling today</h2>
            <Button size="sm" variant="ghost" asChild>
              <Link href="/dashboard/reports">
                Reports
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </header>

          {!overview || overview.topItems.length === 0 ? (
            <EmptyState
              icon={ChefHat}
              title="Nothing sold yet today"
              hint="Best sellers appear once the first order is finished."
            />
          ) : (
            <ol className="divide-border divide-y">
              {overview.topItems.slice(0, 6).map((item, index) => (
                <li key={item.menuItemId} className="flex items-center gap-3 px-4 py-3">
                  <span className="bg-surface-2 text-muted-foreground grid size-7 shrink-0 place-items-center rounded-lg text-xs font-semibold tabular-nums">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
                  <Money
                    minor={item.revenueMinor}
                    className="text-muted-foreground shrink-0 text-sm"
                  />
                  <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums">
                    {item.quantity}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
