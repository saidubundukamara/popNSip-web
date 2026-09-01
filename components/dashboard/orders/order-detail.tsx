"use client";

import * as React from "react";
import {
  Ban,
  Loader2,
  Phone,
  Plus,
  Receipt,
  RotateCcw,
  Smartphone,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmAction } from "@/components/dashboard/shared/confirm-action";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Money } from "@/components/dashboard/shared/money";
import { StatusChip } from "@/components/dashboard/shared/status-chip";
import { TenderPanel } from "@/components/dashboard/pos/tender-panel";
import { useOrderAlerts } from "@/components/dashboard/shell/order-alerts";
import { formatDateTime, formatMinor } from "@/lib/format";
import {
  addAdjustment,
  cancelOrder,
  fetchOrder,
  refundOrder,
  setOrderStatus,
  type OrderStatus,
  type StaffOrderDetail,
} from "@/lib/menu";
import { actionFor, STATUS_META, TONE_TEXT, TYPE_LABELS } from "@/lib/order-vocab";
import type { StaffRole } from "@/lib/api-client";
import { roleAtLeast } from "@/lib/roles";

/**
 * Everything about one order, and everything anyone is allowed to do to it.
 *
 * The sheet this replaces read only the object already sitting in the queue
 * list, so it never saw the server's `allowedTransitions`, `settledMinor` or
 * `balanceDueMinor`, and it did not show the line items at all — you could
 * cancel an order without ever seeing what was in it. Three endpoints that
 * have existed since Phase 4 (refund, mobile-money request, and the detail
 * route itself) had no way to be reached from the browser.
 */
export function OrderDetail({ id, role }: { id: string; role: StaffRole }) {
  const { refresh } = useOrderAlerts();
  const [data, setData] = React.useState<{
    order: StaffOrderDetail;
    settledMinor: number;
    balanceDueMinor: number;
    allowedTransitions: OrderStatus[];
  } | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setData(await fetchOrder(id));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [id]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>, failure: string) {
    setBusy(true);
    try {
      await action();
      await load();
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : failure);
      throw error;
    } finally {
      setBusy(false);
    }
  }

  if (failed) {
    return (
      <div className="bg-card ring-foreground/10 rounded-xl ring-1">
        <EmptyState
          icon={TriangleAlert}
          title="This order did not load"
          hint="It may have been removed, or the connection dropped."
          action={
            <Button size="touch" variant="outline" onClick={() => void load()}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const { order, settledMinor, balanceDueMinor, allowedTransitions } = data;
  const canManage = roleAtLeast(role, "MANAGER");
  const next = allowedTransitions.filter(
    (status) => status !== "CANCELLED" && status !== "REFUNDED",
  );

  return (
    <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[1fr_22rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <section className="bg-card ring-foreground/10 rounded-xl p-4 ring-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{order.reference}</h2>
              <p className="text-muted-foreground text-sm">
                {TYPE_LABELS[order.type]}
                {order.table ? ` · Table ${order.table.code}` : ""} ·{" "}
                {formatDateTime(order.placedAt)}
              </p>
            </div>
            <StatusChip status={order.status} size="lg" />
          </div>

          {order.customer ? (
            <p className="text-muted-foreground mt-3 flex items-center gap-2 text-sm">
              <Phone className="size-4" aria-hidden="true" />
              {order.customer.name ? `${order.customer.name} · ` : ""}
              <a className="hover:text-foreground underline" href={`tel:${order.customer.phoneE164}`}>
                {order.customer.phoneE164}
              </a>
            </p>
          ) : null}

          {order.deliveryAddress ? (
            <p className="bg-surface-2 mt-3 rounded-lg px-3 py-2 text-sm">
              {order.deliveryAddress}
              {order.deliveryNotes ? (
                <span className="text-muted-foreground block">{order.deliveryNotes}</span>
              ) : null}
            </p>
          ) : null}

          <ul className="divide-border mt-4 divide-y">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-3 py-2.5">
                <span className="text-muted-foreground w-8 shrink-0 font-semibold tabular-nums">
                  {item.quantity}×
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{item.itemNameSnapshot}</span>
                  {item.variantNameSnapshot ? (
                    <span className="text-muted-foreground"> · {item.variantNameSnapshot}</span>
                  ) : null}
                  {item.modifiers.length > 0 ? (
                    <span className="text-muted-foreground block text-sm">
                      {item.modifiers.map((modifier) => modifier.nameSnapshot).join(", ")}
                    </span>
                  ) : null}
                  {item.notes ? (
                    <span className="block text-sm italic">“{item.notes}”</span>
                  ) : null}
                </span>
                <Money
                  minor={item.lineTotalMinor}
                  currency={order.currency}
                  className="shrink-0 font-medium"
                />
              </li>
            ))}
          </ul>

          <dl className="border-border mt-3 space-y-1 border-t pt-3 text-sm">
            <Row label="Subtotal">
              <Money minor={order.subtotalMinor} currency={order.currency} />
            </Row>
            {order.adjustments.map((adjustment) => (
              <Row key={adjustment.id} label={adjustment.label}>
                <Money minor={adjustment.amountMinor} currency={order.currency} signed />
              </Row>
            ))}
            <Row label="Total" strong>
              <Money minor={order.totalMinor} currency={order.currency} />
            </Row>
            <Row label="Paid">
              <Money minor={settledMinor} currency={order.currency} />
            </Row>
            {balanceDueMinor > 0 ? (
              <Row label="Still owed" tone="text-st-unpaid" strong>
                <Money minor={balanceDueMinor} currency={order.currency} />
              </Row>
            ) : null}
          </dl>
        </section>

        <Tabs defaultValue="history" className="bg-card ring-foreground/10 rounded-xl p-4 ring-1">
          <TabsList>
            <TabsTrigger value="history">What happened</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            {canManage ? <TabsTrigger value="adjust">Charges</TabsTrigger> : null}
          </TabsList>

          <TabsContent value="history" className="pt-3">
            <ol className="space-y-3">
              {order.statusEvents.map((event) => {
                const meta = STATUS_META[event.toStatus];
                return (
                  <li key={event.id} className="flex items-start gap-3 text-sm">
                    <meta.icon
                      className={cn("mt-0.5 size-4 shrink-0", TONE_TEXT[meta.tone])}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{meta.label}</span>
                      {event.reason ? (
                        <span className="text-muted-foreground block">{event.reason}</span>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      {formatDateTime(event.createdAt)}
                    </span>
                  </li>
                );
              })}
            </ol>
          </TabsContent>

          <TabsContent value="payments" className="pt-3">
            {(order.payments ?? []).length === 0 ? (
              <EmptyState
                size="sm"
                icon={Receipt}
                title="Nothing paid yet"
                hint="Cash and mobile money both show up here once they land."
              />
            ) : (
              <ul className="divide-border divide-y text-sm">
                {(order.payments ?? []).map((payment) => (
                  <li key={payment.id} className="flex items-center gap-3 py-2">
                    {payment.method === "CASH" ? (
                      <Receipt className="text-muted-foreground size-4" aria-hidden="true" />
                    ) : (
                      <Smartphone className="text-muted-foreground size-4" aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">
                        {payment.method === "CASH" ? "Cash" : "Mobile money"}
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        {payment.status === "SUCCEEDED"
                          ? "Received"
                          : payment.status === "PENDING"
                            ? "Waiting for the customer"
                            : payment.status.toLowerCase()}
                        {payment.changeMinor
                          ? ` · change ${formatMinor(payment.changeMinor, order.currency)}`
                          : ""}
                      </span>
                    </span>
                    <Money
                      minor={payment.amountMinor}
                      currency={order.currency}
                      className="font-medium"
                    />
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {canManage ? (
            <TabsContent value="adjust" className="pt-3">
              <form
                className="flex flex-col gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const fields = new FormData(form);
                  const label = String(fields.get("label") ?? "").trim();
                  const leones = Number(fields.get("amount"));
                  if (!label) {
                    toast.error("Give the charge a name, so the customer can be told what it is.");
                    return;
                  }
                  if (!Number.isFinite(leones) || leones === 0) {
                    toast.error("Enter an amount. Use a minus sign for a discount.");
                    return;
                  }
                  void run(
                    () => addAdjustment(order.id, label, Math.round(leones * 100)),
                    "Could not change the order.",
                  ).then(() => form.reset());
                }}
              >
                <p className="text-sm font-medium">Add a charge or a discount</p>
                <div className="flex flex-wrap gap-2">
                  <Input
                    name="label"
                    placeholder="What is it for? e.g. delivery"
                    aria-label="What the charge is for"
                    className="min-w-40 flex-1"
                  />
                  <Input
                    name="amount"
                    inputMode="decimal"
                    placeholder="Le"
                    aria-label="Amount"
                    className="w-28 tabular-nums"
                  />
                  <Button type="submit" size="touch" variant="outline" disabled={busy}>
                    <Plus aria-hidden="true" />
                    Add
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  Put a minus in front of the amount to take money off, like −5.
                </p>
              </form>
            </TabsContent>
          ) : null}
        </Tabs>
      </div>

      <aside className="flex flex-col gap-4">
        {next.length > 0 ? (
          <section className="bg-card ring-foreground/10 flex flex-col gap-2 rounded-xl p-4 ring-1">
            <h2 className="font-semibold">What happens next</h2>
            {next.map((status) => {
              const action = actionFor(status);
              const Icon = action.icon;
              return (
                <Button
                  key={status}
                  size="touch-lg"
                  variant={status === next[0] ? "default" : "outline"}
                  className="w-full"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => setOrderStatus(order.id, status),
                      "Could not move the order.",
                    ).catch(() => undefined)
                  }
                >
                  {busy ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Icon aria-hidden="true" />
                  )}
                  {action.label}
                </Button>
              );
            })}
          </section>
        ) : null}

        {balanceDueMinor > 0 ? (
          <section className="bg-card ring-foreground/10 rounded-xl p-4 ring-1">
            <h2 className="mb-3 font-semibold">Take payment</h2>
            <TenderPanel
              order={order}
              dueMinor={balanceDueMinor}
              onSettled={() => {
                void load();
                refresh();
              }}
              onDone={() => void load()}
            />
          </section>
        ) : null}

        {canManage ? (
          <section className="bg-card ring-foreground/10 flex flex-col gap-2 rounded-xl p-4 ring-1">
            <h2 className="font-semibold">Fix a mistake</h2>

            {settledMinor > 0 ? (
              <ConfirmAction
                trigger={
                  <Button size="touch" variant="outline" className="w-full" disabled={busy}>
                    <RotateCcw aria-hidden="true" />
                    Give the money back
                  </Button>
                }
                title={`Refund ${order.reference}?`}
                consequence={
                  <>
                    <strong>{formatMinor(settledMinor, order.currency)}</strong> goes back to{" "}
                    {order.customer?.name ?? "the customer"}. This cannot be undone, and the money
                    has to be returned to them separately if it was cash.
                  </>
                }
                confirmLabel="Give the money back"
                onConfirm={() =>
                  run(
                    () => refundOrder(order.id, settledMinor, "Refunded by staff"),
                    "Could not refund the order.",
                  ).catch(() => undefined)
                }
              />
            ) : null}

            <ConfirmAction
              trigger={
                <Button size="touch" variant="outline" className="w-full" disabled={busy}>
                  <Ban aria-hidden="true" />
                  Cancel this order
                </Button>
              }
              title={`Cancel ${order.reference}?`}
              consequence={
                <>
                  {order.customer?.name ?? "The customer"} will be told the order is cancelled, and
                  the kitchen will stop work on it.
                  {settledMinor > 0 ? (
                    <>
                      {" "}
                      <strong>
                        {formatMinor(settledMinor, order.currency)} has already been paid
                      </strong>{" "}
                      and will still need refunding separately.
                    </>
                  ) : null}
                </>
              }
              confirmLabel="Cancel this order"
              onConfirm={() =>
                run(
                  () => cancelOrder(order.id, "Cancelled by staff"),
                  "Could not cancel the order.",
                ).catch(() => undefined)
              }
            />
          </section>
        ) : null}
      </aside>
    </div>
  );
}

function Row({
  label,
  children,
  strong,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  strong?: boolean;
  tone?: string;
}) {
  return (
    <div className={cn("flex justify-between gap-4", strong && "font-semibold", tone)}>
      <dt className={cn(!strong && !tone && "text-muted-foreground")}>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
