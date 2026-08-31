"use client";

import { useEffect, useState } from "react";

import { Separator } from "@/components/ui/separator";
import { formatMinor } from "@/lib/format";
import { fetchTrackedOrder, type TrackedOrder } from "@/lib/menu";

/**
 * The tracking page (FR-SHOP-8). Reached only by an unguessable token, and it
 * refreshes itself while the order is still open.
 *
 * Polling rather than SSE: this page is on a customer's phone on mobile data,
 * where a dropped stream is normal and a 15-second poll is both cheaper and
 * more forgiving. The dashboard, which is on wifi and needs sub-second news,
 * gets the stream instead (Phase 5).
 */

const OPEN_STATUSES = new Set([
  "AWAITING_PAYMENT",
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "SERVED",
]);

const STEPS: { status: string; label: string }[] = [
  { status: "PENDING_CONFIRMATION", label: "Sent to the restaurant" },
  { status: "CONFIRMED", label: "Accepted" },
  { status: "PREPARING", label: "Being prepared" },
  { status: "READY", label: "Ready" },
  { status: "COMPLETED", label: "Completed" },
];

const HEADLINE: Record<string, string> = {
  AWAITING_PAYMENT: "Waiting for your payment",
  PENDING_CONFIRMATION: "Sent to the kitchen",
  CONFIRMED: "Your order was accepted",
  PREPARING: "Being prepared now",
  READY: "Ready for you",
  OUT_FOR_DELIVERY: "On the way",
  SERVED: "Served — enjoy",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export function OrderTracker({ token, initial }: { token: string; initial: TrackedOrder }) {
  const [data, setData] = useState(initial);
  const isOpen = OPEN_STATUSES.has(data.order.status);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      // A failed poll is not worth showing: the next one is 15 seconds away.
      void fetchTrackedOrder(token)
        .then(setData)
        .catch(() => undefined);
    }, 15_000);

    return () => clearInterval(timer);
  }, [token, isOpen]);

  const { order } = data;
  const reachedIndex = STEPS.findIndex((step) => step.status === order.status);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8">
      <div>
        <p className="text-muted-foreground text-xs tracking-wide uppercase">Order {order.reference}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{HEADLINE[order.status] ?? order.status}</h1>
        {isOpen ? (
          <p className="text-muted-foreground mt-1 text-sm">This page updates itself — leave it open.</p>
        ) : null}
      </div>

      {order.status !== "CANCELLED" && order.status !== "REFUNDED" ? (
        <ol className="flex flex-col gap-3">
          {STEPS.map((step, index) => {
            const done = reachedIndex >= 0 && index <= reachedIndex;
            return (
              <li key={step.status} className="flex items-center gap-3 text-sm">
                <span
                  aria-hidden
                  className={`size-2.5 shrink-0 rounded-full ${done ? "bg-foreground" : "bg-muted-foreground/30"}`}
                />
                <span className={done ? "font-medium" : "text-muted-foreground"}>{step.label}</span>
              </li>
            );
          })}
        </ol>
      ) : null}

      <Separator />

      <ul className="flex flex-col gap-3">
        {order.items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex items-start justify-between gap-3 text-sm">
            <span className="min-w-0">
              <span className="font-medium">
                {item.quantity}× {item.name}
              </span>
              {item.variantName ? <span className="text-muted-foreground"> · {item.variantName}</span> : null}
              {item.modifiers.length > 0 ? (
                <span className="text-muted-foreground block text-xs">
                  {item.modifiers.map((modifier) => modifier.name).join(", ")}
                </span>
              ) : null}
              {item.notes ? <span className="text-muted-foreground block text-xs italic">“{item.notes}”</span> : null}
            </span>
            <span className="tabular-nums">{formatMinor(item.lineTotalMinor, order.currency)}</span>
          </li>
        ))}
      </ul>

      <Separator />

      <dl className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="tabular-nums">{formatMinor(order.subtotalMinor, order.currency)}</dd>
        </div>
        {order.adjustmentsMinor !== 0 ? (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Adjustments</dt>
            <dd className="tabular-nums">{formatMinor(order.adjustmentsMinor, order.currency)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between font-medium">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatMinor(order.totalMinor, order.currency)}</dd>
        </div>
        {data.balanceDueMinor > 0 ? (
          <div className="text-muted-foreground flex justify-between text-xs">
            <dt>To pay</dt>
            <dd className="tabular-nums">{formatMinor(data.balanceDueMinor, order.currency)}</dd>
          </div>
        ) : null}
      </dl>

      {order.deliveryAddress ? (
        <p className="text-muted-foreground text-xs">Delivering to {order.deliveryAddress}</p>
      ) : null}
    </div>
  );
}
