"use client";

import * as React from "react";
import { Search, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Money } from "@/components/dashboard/shared/money";
import { formatDay } from "@/lib/format";
import { fetchCustomers, type Customer } from "@/lib/admin";

/**
 * Customers (FR-CUST-3). Phone is the identity, so the search matches a number
 * typed the way it is spoken as well as a name.
 */
export function CustomersView() {
  const [term, setTerm] = React.useState("");
  const [applied, setApplied] = React.useState("");
  const [customers, setCustomers] = React.useState<Customer[] | null>(null);

  const load = React.useCallback(async () => {
    setCustomers(null);
    try {
      const { customers: found } = await fetchCustomers(applied || undefined);
      setCustomers(found);
    } catch {
      setCustomers([]);
    }
  }, [applied]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <form
        role="search"
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setApplied(term.trim());
        }}
      >
        <div className="relative min-w-56 flex-1">
          <Search
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Name or phone number"
            aria-label="Search customers"
            className="pl-9"
          />
        </div>
        <Button type="submit" size="touch">
          Search
        </Button>
      </form>

      <div className="bg-card ring-foreground/10 overflow-hidden rounded-xl ring-1">
        {customers === null ? (
          <div className="space-y-px p-4">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-14" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={applied ? `Nobody matches “${applied}”` : "No customers yet"}
            hint="A customer is remembered the first time an order carries their phone number."
          />
        ) : (
          <ul className="divide-border divide-y">
            {customers.map((customer) => (
              <li key={customer.id} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {customer.name ?? "No name given"}
                  </span>
                  <span className="text-muted-foreground block truncate text-sm">
                    {customer.phoneE164}
                    {customer.lastAddress ? ` · ${customer.lastAddress}` : ""}
                  </span>
                </span>
                <span className="hidden shrink-0 text-right sm:block">
                  <span className="block text-sm font-semibold tabular-nums">
                    {customer.orderCount}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {customer.orderCount === 1 ? "order" : "orders"}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <Money
                    minor={customer.lifetimeSpendMinor}
                    className="block text-sm font-semibold"
                  />
                  <span className="text-muted-foreground block text-xs">
                    since {formatDay(customer.createdAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-muted-foreground text-sm">
        Spending counts finished orders only, so a cancelled or refunded order never inflates a
        total.
      </p>
    </div>
  );
}
