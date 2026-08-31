"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatMinor } from "@/lib/format";

/**
 * Orders by hour of day (FR-STAT-3), so the owner can staff the shift.
 *
 * One series, so no legend — the heading names it. Bars are capped thin with a
 * rounded data-end and a square baseline; the grid is a solid hairline, never
 * dashed. The container is sized to include the axis band so the card never
 * grows its own little scrollbar.
 */
type Bucket = { hour: number; orderCount: number; revenueMinor: number };

export function HoursChart({
  hours,
  currency,
}: {
  hours: { hour: number; orderCount: number; revenueMinor: number }[];
  currency: string;
}) {
  const total = hours.reduce((sum, bucket) => sum + bucket.orderCount, 0);

  if (total === 0) {
    return <p className="text-muted-foreground py-10 text-center text-sm">No orders in this period.</p>;
  }

  const data = hours.map((bucket) => ({
    ...bucket,
    // Two-hourly ticks keep 24 labels from colliding on a phone.
    label: `${String(bucket.hour).padStart(2, "0")}`,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -20 }}>
          <CartesianGrid stroke="var(--viz-grid)" strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: "var(--viz-grid)" }}
            tick={{ fontSize: 11, fill: "currentColor" }}
            className="text-muted-foreground"
            interval={1}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={40}
            tick={{ fontSize: 11, fill: "currentColor" }}
            className="text-muted-foreground"
          />
          <Tooltip
            cursor={{ fill: "var(--viz-track)" }}
            content={({ active, payload }) => {
              const bucket = active ? (payload?.[0]?.payload as Bucket | undefined) : undefined;
              if (!bucket) return null;

              return (
                <div className="bg-popover text-popover-foreground rounded-md border px-2.5 py-1.5 text-xs shadow-sm">
                  <p className="font-medium">{String(bucket.hour).padStart(2, "0")}:00</p>
                  <p className="text-muted-foreground">
                    {bucket.orderCount} {bucket.orderCount === 1 ? "order" : "orders"} ·{" "}
                    {formatMinor(bucket.revenueMinor, currency)}
                  </p>
                </div>
              );
            }}
          />
          <Bar
            dataKey="orderCount"
            fill="var(--viz-series-1)"
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
