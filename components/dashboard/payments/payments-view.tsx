"use client";

import * as React from "react";
import Link from "next/link";
import { Banknote, ChevronRight, CreditCard, Smartphone } from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterChip, FilterGroup } from "@/components/dashboard/shared/filter-chips";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Money } from "@/components/dashboard/shared/money";
import { formatDateTime } from "@/lib/format";
import { fetchPayments, type PaymentRow } from "@/lib/admin";

const METHODS = [
  { value: "ALL", label: "Everything" },
  { value: "CASH", label: "Cash" },
  { value: "MOBILE_MONEY", label: "Mobile money" },
] as const;

const STATES = [
  { value: "ALL", label: "Any state" },
  { value: "SUCCEEDED", label: "Received" },
  { value: "PENDING", label: "Waiting" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
] as const;

/** Plain words for what the payment row means, with the tone that carries it. */
const STATE_COPY: Record<PaymentRow["status"], { label: string; className: string }> = {
  SUCCEEDED: { label: "Received", className: "bg-st-ready-bg text-st-ready" },
  PENDING: { label: "Waiting on the customer", className: "bg-st-pending-bg text-st-pending" },
  FAILED: { label: "Failed", className: "bg-st-unpaid-bg text-st-unpaid" },
  EXPIRED: { label: "Ran out of time", className: "bg-st-void-bg text-st-void" },
  REFUNDED: { label: "Given back", className: "bg-st-void-bg text-st-void" },
};

/**
 * The money ledger. Nothing here can change an order — settlement is the
 * server's alone, and only `ActorType.SYSTEM` may declare an order paid
 * (FR-PAY-4). This screen reads.
 */
export function PaymentsView() {
  const [method, setMethod] = React.useState<(typeof METHODS)[number]["value"]>("ALL");
  const [state, setState] = React.useState<(typeof STATES)[number]["value"]>("ALL");
  const [payments, setPayments] = React.useState<PaymentRow[] | null>(null);

  const load = React.useCallback(async () => {
    setPayments(null);
    try {
      const { payments: found } = await fetchPayments({
        ...(method === "ALL" ? {} : { method }),
        ...(state === "ALL" ? {} : { status: state }),
      });
      setPayments(found);
    } catch {
      setPayments([]);
    }
  }, [method, state]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const received = (payments ?? [])
    .filter((payment) => payment.status === "SUCCEEDED")
    .reduce((total, payment) => total + payment.amountMinor, 0);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap gap-x-6 gap-y-4">
        <FilterGroup label="Paid with">
          {METHODS.map((option) => (
            <FilterChip
              key={option.value}
              active={method === option.value}
              onClick={() => setMethod(option.value)}
            >
              {option.label}
            </FilterChip>
          ))}
        </FilterGroup>
        <FilterGroup label="State">
          {STATES.map((option) => (
            <FilterChip
              key={option.value}
              active={state === option.value}
              onClick={() => setState(option.value)}
            >
              {option.label}
            </FilterChip>
          ))}
        </FilterGroup>
      </div>

      {payments && payments.length > 0 ? (
        <p className="text-muted-foreground text-sm">
          <Money minor={received} className="text-foreground font-semibold" /> received across{" "}
          {payments.length} {payments.length === 1 ? "record" : "records"}.
        </p>
      ) : null}

      <div className="bg-card ring-foreground/10 overflow-hidden rounded-xl ring-1">
        {payments === null ? (
          <div className="space-y-px p-4">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-14" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Nothing to show"
            hint="Cash taken at the counter and mobile money from customers both land here."
          />
        ) : (
          <ul className="divide-border divide-y">
            {payments.map((payment) => {
              const copy = STATE_COPY[payment.status];
              return (
                <li key={payment.id}>
                  <Link
                    href={`/dashboard/orders/${payment.order.id}`}
                    className="hover:bg-muted flex items-center gap-3 px-4 py-3 transition-colors"
                  >
                    {payment.method === "CASH" ? (
                      <Banknote className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
                    ) : (
                      <Smartphone
                        className="text-muted-foreground size-5 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{payment.order.reference}</span>
                      <span className="text-muted-foreground block truncate text-sm">
                        {payment.method === "CASH" ? "Cash" : "Mobile money"} ·{" "}
                        {formatDateTime(payment.createdAt)}
                        {payment.changeMinor ? " · change given" : ""}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline",
                        copy.className,
                      )}
                    >
                      {copy.label}
                    </span>
                    <Money
                      minor={payment.amountMinor}
                      currency={payment.order.currency}
                      className="shrink-0 font-semibold"
                    />
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
