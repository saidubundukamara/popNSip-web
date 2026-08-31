"use client";

import { useState } from "react";
import { toast } from "sonner";

import { HoursChart } from "@/components/dashboard/analytics/hours-chart";
import { RankedBars } from "@/components/dashboard/analytics/ranked-bars";
import { StatTile } from "@/components/dashboard/analytics/stat-tile";
import { Button } from "@/components/ui/button";
import { formatMinor } from "@/lib/format";
import { fetchAnalytics, type AnalyticsOverview, type AnalyticsPeriod } from "@/lib/menu";

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

/**
 * Label and colour slot per category. The slot is fixed to the entity so that
 * changing the period — which reorders the rows — never repaints them.
 */
const PAYMENT_META: Record<string, { label: string; slot: number }> = {
  CASH: { label: "Cash", slot: 1 },
  MOBILE_MONEY: { label: "Mobile money", slot: 2 },
  UNRECORDED: { label: "No payment recorded", slot: 3 },
};

const TYPE_META: Record<string, { label: string; slot: number }> = {
  DELIVERY: { label: "Delivery", slot: 1 },
  PICKUP: { label: "Pickup", slot: 2 },
  DINE_IN: { label: "Dine-in", slot: 3 },
  WALK_IN: { label: "Walk-in", slot: 4 },
};

/**
 * The end date is exclusive, so a single day reads as one date rather than as
 * a range ending tomorrow.
 */
function describeRange(range: AnalyticsOverview["range"]): string {
  const end = new Date(`${range.toLocalDateExclusive}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() - 1);
  const lastDay = end.toISOString().slice(0, 10);

  return range.fromLocalDate === lastDay ? range.fromLocalDate : `${range.fromLocalDate} to ${lastDay}`;
}

export function AnalyticsView({ initial }: { initial: AnalyticsOverview }) {
  const [data, setData] = useState(initial);
  const [period, setPeriod] = useState<AnalyticsPeriod>("today");
  const [loading, setLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const currency = "SLE";

  const choose = (next: AnalyticsPeriod) => {
    setPeriod(next);
    setLoading(true);
    void fetchAnalytics(next)
      .then(setData)
      .catch(() => toast.error("Could not load those numbers."))
      .finally(() => setLoading(false));
  };

  const { summary, topItems, hours, splits } = data;

  return (
    <div className={`flex flex-col gap-6 ${loading ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {describeRange(summary.range)} · {summary.range.timezone}
          </p>
        </div>

        {/* Filters in one row above the charts. */}
        <div className="flex gap-1" role="group" aria-label="Period">
          {PERIODS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={period === option.value ? "default" : "outline"}
              onClick={() => choose(option.value)}
              disabled={loading}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Revenue" valueMinor={summary.revenueMinor} currency={currency} hint="Completed orders only" />
        <StatTile label="Orders" count={summary.orderCount} />
        <StatTile
          label="Average order"
          valueMinor={summary.averageOrderValueMinor}
          currency={currency}
          hint={summary.orderCount === 0 ? "No orders to average" : undefined}
        />
      </div>

      <section className="bg-card rounded-lg border p-4">
        <h2 className="text-sm font-medium">Orders by hour</h2>
        <p className="text-muted-foreground mb-3 text-xs">
          Local time in {summary.range.timezone.split("/")[1]?.replace("_", " ")}
        </p>
        <HoursChart hours={hours} currency={currency} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="bg-card rounded-lg border p-4">
          <h2 className="mb-3 text-sm font-medium">Top items</h2>
          <RankedBars
            currency={currency}
            emptyMessage="Nothing sold in this period."
            rows={topItems.map((item) => ({
              key: item.menuItemId,
              label: item.name,
              valueMinor: item.revenueMinor,
              secondary: `${item.quantity} sold`,
            }))}
          />
        </section>

        <div className="flex flex-col gap-4">
          <section className="bg-card rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-medium">Payment method</h2>
            <RankedBars
              currency={currency}
              emptyMessage="No payments in this period."
              rows={splits.paymentMethod.map((split) => ({
                key: split.key,
                label: PAYMENT_META[split.key]?.label ?? split.key,
                colorSlot: PAYMENT_META[split.key]?.slot ?? 4,
                valueMinor: split.valueMinor,
                secondary: `${split.orderCount} order${split.orderCount === 1 ? "" : "s"}`,
              }))}
            />
          </section>

          <section className="bg-card rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-medium">Order type</h2>
            <RankedBars
              currency={currency}
              emptyMessage="No orders in this period."
              rows={splits.orderType.map((split) => ({
                key: split.key,
                label: TYPE_META[split.key]?.label ?? split.key,
                colorSlot: TYPE_META[split.key]?.slot ?? 4,
                valueMinor: split.valueMinor,
                secondary: `${split.orderCount} order${split.orderCount === 1 ? "" : "s"}`,
              }))}
            />
          </section>
        </div>
      </div>

      {/* A table view of the same figures: identity never rests on colour, and
          the numbers are readable by anyone the chart does not serve. */}
      <section className="bg-card rounded-lg border p-4">
        <button
          type="button"
          onClick={() => setShowTable((open) => !open)}
          className="text-sm font-medium hover:underline"
          aria-expanded={showTable}
        >
          {showTable ? "Hide" : "Show"} the numbers as a table
        </button>

        {showTable ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Orders by hour, with revenue</caption>
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs">
                  <th scope="col" className="py-2 font-medium">Hour</th>
                  <th scope="col" className="py-2 text-right font-medium">Orders</th>
                  <th scope="col" className="py-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {hours
                  .filter((bucket) => bucket.orderCount > 0)
                  .map((bucket) => (
                    <tr key={bucket.hour} className="border-b last:border-0">
                      <td className="py-1.5 tabular-nums">{String(bucket.hour).padStart(2, "0")}:00</td>
                      <td className="py-1.5 text-right tabular-nums">{bucket.orderCount}</td>
                      <td className="py-1.5 text-right tabular-nums">
                        {formatMinor(bucket.revenueMinor, currency)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
