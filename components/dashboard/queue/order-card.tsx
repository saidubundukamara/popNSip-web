"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, MoreVertical, Receipt, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AgeLabel, AgeRail } from "@/components/dashboard/shared/age-rail";
import { Money } from "@/components/dashboard/shared/money";
import { StatusChip } from "@/components/dashboard/shared/status-chip";
import { formatClock } from "@/lib/format";
import { nextActions, setOrderStatus, type StaffOrder } from "@/lib/menu";
import { actionFor, balanceDueOf, STATUS_META, TONE_VAR, TYPE_LABELS } from "@/lib/order-vocab";

/**
 * One ticket.
 *
 * Three things changed from the version this replaces, all of them things a
 * cashier noticed before a designer did:
 *
 * - **The card says its own status.** Previously status lived only in the
 *   column heading, so a card read on a phone — where lanes stack — told you
 *   nothing, and "unpaid" was a pale amber tint, which is colour alone.
 * - **The button says what the tap does.** "Preparing" is a noun printed on a
 *   control that starts cooking. It now says "Send to kitchen".
 * - **It ages.** The rail down the left fills against a target for the current
 *   status, so a late ticket announces itself across a counter.
 */
export function OrderCard({
  order,
  onPatched,
  onFailed,
  compact = false,
}: {
  order: StaffOrder;
  onPatched: (order: StaffOrder) => void;
  onFailed: () => void;
  compact?: boolean;
}) {
  const [busy, setBusy] = React.useState(false);
  const [landed, setLanded] = React.useState(false);
  const previousStatus = React.useRef(order.status);

  // A card that moves lane is the same card in a new place. Pulse it in its
  // destination's colour so the eye can follow it there instead of hunting.
  React.useEffect(() => {
    if (previousStatus.current === order.status) return;
    previousStatus.current = order.status;
    setLanded(true);
    const timer = setTimeout(() => setLanded(false), 900);
    return () => clearTimeout(timer);
  }, [order.status]);

  const balanceDue = balanceDueOf(order);
  const target = nextActions(order.status, order.type)[0];
  const action = target ? actionFor(target) : null;
  const ActionIcon = action?.icon;

  async function advance() {
    if (!target) return;
    setBusy(true);
    try {
      // The route answers `changed: false` when the order is already there
      // (FR-POS-10), so a double tap is a no-op rather than an error.
      const { order: updated } = await setOrderStatus(order.id, target);
      onPatched(updated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not move the order.", {
        action: { label: "Try again", onClick: () => void advance() },
      });
      onFailed();
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className={cn(
        "bg-card ring-foreground/10 settle flex gap-3 rounded-xl p-3 ring-1",
        landed && "land",
      )}
      style={
        landed
          ? ({ "--land-ring": TONE_VAR[STATUS_META[order.status].tone] } as React.CSSProperties)
          : undefined
      }
    >
      <AgeRail placedAt={order.placedAt} status={order.status} />

      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{order.reference}</p>
            <p className="text-muted-foreground truncate text-sm">
              {TYPE_LABELS[order.type]}
              {order.table ? ` · ${order.table.code}` : ""}
              {order.customer?.name ? ` · ${order.customer.name}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <StatusChip status={order.status} size="sm" />
            <span className="text-muted-foreground text-xs">
              <AgeLabel placedAt={order.placedAt} status={order.status} /> ·{" "}
              {formatClock(order.placedAt)}
            </span>
          </div>
        </div>

        {order.deliveryAddress ? (
          <p className="text-muted-foreground line-clamp-2 text-sm">{order.deliveryAddress}</p>
        ) : null}

        {!compact ? (
          <ul className="flex flex-col gap-1 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-2">
                <span className="text-muted-foreground shrink-0 font-semibold tabular-nums">
                  {item.quantity}×
                </span>
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
                  {item.notes ? (
                    <span className="block text-xs italic">“{item.notes}”</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {/* FR-POS-5. A tint is not "visually distinct" on a bright counter, so
            an outstanding balance gets a labelled bar of its own. */}
        {balanceDue > 0 ? (
          <p className="bg-st-unpaid-bg text-st-unpaid flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold">
            <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
            <span>
              Not paid — <Money minor={balanceDue} currency={order.currency} /> due
            </span>
          </p>
        ) : (
          <p className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Paid</span>
            <Money minor={order.totalMinor} currency={order.currency} className="font-semibold" />
          </p>
        )}

        {balanceDue > 0 ? (
          <p className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Total</span>
            <Money minor={order.totalMinor} currency={order.currency} className="font-semibold" />
          </p>
        ) : null}

        {/* FR-POS-4: one primary action, the rest behind an overflow — but the
            primary is always visible, never hidden inside the menu. */}
        <div className="flex gap-2">
          {action && ActionIcon ? (
            <Button
              size="touch-lg"
              className="h-auto min-h-14 min-w-0 flex-1 py-2 text-base leading-tight whitespace-normal"
              disabled={busy}
              onClick={advance}
            >
              {busy ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <ActionIcon aria-hidden="true" />
              )}
              {action.label}
            </Button>
          ) : (
            <Button
              size="touch-lg"
              variant="outline"
              className="h-auto min-h-14 min-w-0 flex-1 py-2 text-base leading-tight whitespace-normal"
              asChild
            >
              <Link href={`/dashboard/orders/${order.id}`}>
                <Receipt aria-hidden="true" />
                Open order
              </Link>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-touch" variant="outline" className="h-auto min-h-14 self-stretch">
                <MoreVertical aria-hidden="true" />
                <span className="sr-only">More for {order.reference}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/orders/${order.id}`}>
                  <Receipt aria-hidden="true" />
                  Open order
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </article>
  );
}
