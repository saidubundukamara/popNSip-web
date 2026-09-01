"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Search, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { FilterChip, FilterGroup } from "@/components/dashboard/shared/filter-chips";
import { Money } from "@/components/dashboard/shared/money";
import { StatusChip } from "@/components/dashboard/shared/status-chip";
import { formatDateTime } from "@/lib/format";
import { searchOrders, type OrderStatus, type StaffOrder } from "@/lib/menu";
import { balanceDueOf, STATUS_META, TYPE_LABELS } from "@/lib/order-vocab";

const STATUS_FILTERS: (OrderStatus | "ALL")[] = [
  "ALL",
  "COMPLETED",
  "SERVED",
  "CANCELLED",
  "REFUNDED",
];

const TYPE_FILTERS: (StaffOrder["type"] | "ALL")[] = [
  "ALL",
  "DELIVERY",
  "PICKUP",
  "DINE_IN",
  "WALK_IN",
];

/**
 * Order history and lookup (FR-POS-8).
 *
 * `searchOrders` has been written and called by nothing since Phase 5, which
 * meant a manager could not answer "what did I order yesterday?" at all — the
 * only orders reachable from the browser were the ones still open. Phone
 * matching is the server's `phoneSearchFragment`, so staff type a number the
 * way it is said — 077 900100 — against a stored +23277900100.
 */
export function OrderSearchView() {
  const router = useRouter();
  const params = useSearchParams();
  const initialTerm = params.get("search") ?? "";

  const [term, setTerm] = React.useState(initialTerm);
  const [applied, setApplied] = React.useState(initialTerm);
  const [status, setStatus] = React.useState<OrderStatus | "ALL">("ALL");
  const [type, setType] = React.useState<StaffOrder["type"] | "ALL">("ALL");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [orders, setOrders] = React.useState<StaffOrder[] | null>(null);

  // The API validates `from`/`to` as full ISO datetimes, while a date input
  // gives a plain YYYY-MM-DD — sending that straight through is a 400. The
  // branch runs on Africa/Freetown, which is UTC+0 all year with no daylight
  // saving, so a plain UTC boundary is the local one.
  const load = React.useCallback(async () => {
    setOrders(null);
    try {
      const { orders: found } = await searchOrders({
        ...(applied ? { search: applied } : {}),
        ...(status === "ALL" ? {} : { status }),
        ...(type === "ALL" ? {} : { type }),
        ...(from ? { from: `${from}T00:00:00.000Z` } : {}),
        ...(to ? { to: `${to}T23:59:59.999Z` } : {}),
        take: "50",
      });
      setOrders(found);
    } catch {
      setOrders([]);
    }
  }, [applied, status, type, from, to]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setApplied(term.trim());
    // Keep the URL honest so the search can be shared or reloaded.
    router.replace(term.trim() ? `/dashboard/orders?search=${encodeURIComponent(term.trim())}` : "/dashboard/orders");
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <form onSubmit={submit} role="search" className="flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Order number, customer name, or phone"
            aria-label="Search orders"
            className="pl-9"
          />
        </div>
        <Button type="submit" size="touch">
          Search
        </Button>
      </form>

      <div className="flex flex-wrap gap-x-6 gap-y-4">
        <FilterGroup label="Status">
          {STATUS_FILTERS.map((value) => (
            <FilterChip key={value} active={status === value} onClick={() => setStatus(value)}>
              {value === "ALL" ? "Any" : STATUS_META[value].label}
            </FilterChip>
          ))}
        </FilterGroup>
        <FilterGroup label="Kind">
          {TYPE_FILTERS.map((value) => (
            <FilterChip key={value} active={type === value} onClick={() => setType(value)}>
              {value === "ALL" ? "Any" : TYPE_LABELS[value]}
            </FilterChip>
          ))}
        </FilterGroup>
        <FilterGroup label="Between">
          <Input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            aria-label="From date"
            className="w-40"
          />
          <Input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            aria-label="To date"
            className="w-40"
          />
        </FilterGroup>
      </div>

      <div className="bg-card ring-foreground/10 overflow-hidden rounded-xl ring-1">
        {orders === null ? (
          <div className="space-y-px p-4">
            {[0, 1, 2, 3, 4].map((row) => (
              <Skeleton key={row} className="h-14" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={applied ? `Nothing found for “${applied}”` : "No orders match those filters"}
            hint="Try a phone number without the country code, part of a name, or widen the dates."
          />
        ) : (
          <ul className="divide-border divide-y">
            {orders.map((order) => {
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
                        {order.customer?.name ? ` · ${order.customer.name}` : ""} ·{" "}
                        {formatDateTime(order.placedAt)}
                      </span>
                    </span>
                    <StatusChip
                      status={order.status}
                      size="sm"
                      className="hidden shrink-0 sm:inline-flex"
                    />
                    <span className="shrink-0 text-right">
                      <Money
                        minor={order.totalMinor}
                        currency={order.currency}
                        className="block font-semibold"
                      />
                      {due > 0 ? (
                        <span className="text-st-unpaid text-xs font-semibold">Not paid</span>
                      ) : null}
                    </span>
                    <ChevronRight
                      className="text-muted-foreground size-4 shrink-0"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
