"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatMinor } from "@/lib/format";
import {
  addAdjustment,
  cancelOrder,
  nextActions,
  recordCash,
  setOrderStatus,
  STATUS_LABELS,
  type StaffOrder,
} from "@/lib/menu";

const TYPE_LABELS: Record<StaffOrder["type"], string> = {
  DELIVERY: "Delivery",
  PICKUP: "Pickup",
  DINE_IN: "Dine-in",
  WALK_IN: "Walk-in",
};

/** FR-POS-1: elapsed time is the number staff actually read off the card. */
function useElapsed(since: string): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.max(0, Math.floor((now - new Date(since).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function OrderCard({ order, onChanged }: { order: StaffOrder; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const elapsed = useElapsed(order.placedAt);

  const settled = order.payments
    .filter((payment) => payment.status === "SUCCEEDED")
    .reduce((total, payment) => total + payment.amountMinor, 0);
  const balanceDue = order.totalMinor - settled;
  const actions = nextActions(order.status, order.type);

  const run = async (action: () => Promise<unknown>, failure: string) => {
    setBusy(true);
    try {
      await action();
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : failure);
    } finally {
      setBusy(false);
    }
  };

  // FR-POS-5: unpaid orders have to be distinguishable at a glance.
  const unpaid = balanceDue > 0;
  const awaitingPayment = order.status === "AWAITING_PAYMENT";

  return (
    <>
      <article
        className={`bg-card flex flex-col gap-3 rounded-lg border p-3 ${
          awaitingPayment ? "border-amber-400 bg-amber-50/50" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium">{order.reference}</p>
            <p className="text-muted-foreground text-xs">
              {TYPE_LABELS[order.type]}
              {order.table ? ` · ${order.table.code}` : ""}
              {order.customer?.name ? ` · ${order.customer.name}` : ""}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0 tabular-nums" title="Time since the order was placed">
            {elapsed}
          </Badge>
        </div>

        {order.deliveryAddress ? (
          <p className="text-muted-foreground line-clamp-2 text-xs">{order.deliveryAddress}</p>
        ) : null}

        <ul className="flex flex-col gap-0.5 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-2">
              <span className="text-muted-foreground tabular-nums">{item.quantity}×</span>
              <span className="min-w-0">
                {item.itemNameSnapshot}
                {item.variantNameSnapshot ? (
                  <span className="text-muted-foreground"> · {item.variantNameSnapshot}</span>
                ) : null}
                {item.modifiers.length > 0 ? (
                  <span className="text-muted-foreground block text-xs">
                    {item.modifiers.map((modifier) => modifier.nameSnapshot).join(", ")}
                  </span>
                ) : null}
                {item.notes ? <span className="block text-xs italic">“{item.notes}”</span> : null}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-medium tabular-nums">{formatMinor(order.totalMinor, order.currency)}</span>
          <span className={`text-xs ${unpaid ? "font-medium text-amber-700" : "text-emerald-700"}`}>
            {unpaid ? `${formatMinor(balanceDue, order.currency)} due` : "Paid"}
          </span>
        </div>

        {/* FR-POS-4: one primary action, everything else behind the sheet. */}
        <div className="flex gap-2">
          {actions[0] ? (
            <Button
              size="sm"
              className="flex-1"
              disabled={busy}
              onClick={() => void run(() => setOrderStatus(order.id, actions[0]!), "Could not update the order.")}
            >
              {STATUS_LABELS[actions[0]]}
            </Button>
          ) : null}
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setOpen(true)}>
            Details
          </Button>
        </div>
      </article>

      {open ? (
        <OrderSheet order={order} balanceDue={balanceDue} onClose={() => setOpen(false)} onChanged={onChanged} />
      ) : null}
    </>
  );
}

function OrderSheet({
  order,
  balanceDue,
  onClose,
  onChanged,
}: {
  order: StaffOrder;
  balanceDue: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [change, setChange] = useState<number | null>(null);

  const run = async (action: () => Promise<unknown>, failure: string) => {
    setBusy(true);
    try {
      await action();
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open onOpenChange={(value: boolean) => !value && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{order.reference}</SheetTitle>
          <SheetDescription>
            {STATUS_LABELS[order.status]} · {TYPE_LABELS[order.type]}
            {order.customer?.phoneE164 ? ` · ${order.customer.phoneE164}` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-8">
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
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Outstanding</dt>
              <dd className="tabular-nums">{formatMinor(balanceDue, order.currency)}</dd>
            </div>
          </dl>

          {/* ── delivery fee / discount ── */}
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const leones = Number(data.get("amount"));
              const label = String(data.get("label") ?? "").trim();
              if (!label || !Number.isFinite(leones) || leones === 0) return;
              event.currentTarget.reset();
              void run(() => addAdjustment(order.id, label, Math.round(leones * 100)), "Could not adjust the order.");
            }}
          >
            <p className="text-sm font-medium">Adjustment</p>
            <div className="flex gap-2">
              <Input name="label" placeholder="Delivery fee" aria-label="Adjustment label" />
              <Input name="amount" type="number" step="0.01" placeholder="Le" aria-label="Amount" className="w-28" />
              <Button type="submit" variant="outline" size="sm" disabled={busy}>
                Add
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">Use a negative amount for a discount.</p>
          </form>

          {/* ── cash ── */}
          {balanceDue > 0 ? (
            <form
              className="flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const tendered = Number(data.get("tendered"));
                event.currentTarget.reset();

                void run(async () => {
                  const result = await recordCash(
                    order.id,
                    balanceDue,
                    Number.isFinite(tendered) && tendered > 0 ? Math.round(tendered * 100) : undefined,
                  );
                  setChange(result.changeMinor);
                }, "Could not record the payment.");
              }}
            >
              <p className="text-sm font-medium">Take cash</p>
              <div className="flex gap-2">
                <Input
                  name="tendered"
                  type="number"
                  step="0.01"
                  placeholder="Tendered (Le)"
                  aria-label="Amount tendered"
                />
                <Button type="submit" size="sm" disabled={busy}>
                  Record {formatMinor(balanceDue, order.currency)}
                </Button>
              </div>
              {change !== null ? (
                <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                  Change due: {formatMinor(change, order.currency)}
                </p>
              ) : null}
            </form>
          ) : null}

          {/* ── cancel ── */}
          <form
            className="flex flex-col gap-2 border-t pt-4"
            onSubmit={(event) => {
              event.preventDefault();
              const reason = String(new FormData(event.currentTarget).get("reason") ?? "").trim();
              if (!reason) return;
              void run(async () => {
                await cancelOrder(order.id, reason);
                onClose();
              }, "Could not cancel the order.");
            }}
          >
            <p className="text-sm font-medium">Cancel order</p>
            <div className="flex gap-2">
              <Input name="reason" placeholder="Reason" aria-label="Cancellation reason" required />
              <Button type="submit" variant="destructive" size="sm" disabled={busy}>
                Cancel
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">Manager or owner only. A reason is required.</p>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
