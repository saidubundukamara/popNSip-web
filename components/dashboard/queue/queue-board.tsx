"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { OrderCard } from "@/components/dashboard/queue/order-card";
import { Badge } from "@/components/ui/badge";
import { useOrderStream } from "@/hooks/use-order-stream";
import { fetchQueue, STATUS_LABELS, type OrderStatus, type StaffOrder } from "@/lib/menu";

/**
 * The live queue (FR-POS-1). Phone-first: one column of columns on a narrow
 * screen, side by side on a tablet in landscape.
 */

const COLUMNS: OrderStatus[] = [
  "PENDING_CONFIRMATION",
  "AWAITING_PAYMENT",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "SERVED",
];

export function QueueBoard({ initialOrders }: { initialOrders: StaffOrder[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const knownIds = useRef(new Set(initialOrders.map((order) => order.id)));

  const refresh = useCallback(async () => {
    try {
      const { orders: fresh } = await fetchQueue();

      // FR-POS-3: announce anything that was not here a moment ago.
      const arrived = fresh.filter((order) => !knownIds.current.has(order.id));
      knownIds.current = new Set(fresh.map((order) => order.id));

      setOrders(fresh);

      if (arrived.length > 0) {
        announce();
        toast.success(
          arrived.length === 1 ? `New order ${arrived[0]?.reference}` : `${arrived.length} new orders`,
        );
      }
    } catch {
      // The stream or the next poll will try again; a toast per failed refresh
      // would bury the screen during a network wobble.
    }
  }, []);

  const { mode, lastEventAt } = useOrderStream(refresh);

  const grouped = COLUMNS.map((status) => ({
    status,
    orders: orders.filter((order) => order.status === status),
  })).filter((column) => column.orders.length > 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Queue</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {orders.length} open {orders.length === 1 ? "order" : "orders"}
          </p>
        </div>
        <ConnectionBadge mode={mode} lastEventAt={lastEventAt} />
      </div>

      {grouped.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed py-16 text-center text-sm">
          Nothing in the queue. New orders appear here on their own.
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {grouped.map((column) => (
            <section key={column.status} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                {STATUS_LABELS[column.status]}
                <Badge variant="secondary" className="tabular-nums">
                  {column.orders.length}
                </Badge>
              </h2>

              <ul className="flex flex-col gap-3">
                {column.orders.map((order) => (
                  <li key={order.id}>
                    <OrderCard order={order} onChanged={refresh} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ConnectionBadge({ mode, lastEventAt }: { mode: ReturnType<typeof useOrderStream>["mode"]; lastEventAt: Date | null }) {
  const label =
    mode === "live" ? "Live" : mode === "polling" ? "Reconnecting — checking every 10s" : "Connecting…";

  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        aria-hidden
        className={`size-2 rounded-full ${
          mode === "live" ? "bg-emerald-500" : mode === "polling" ? "bg-amber-500" : "bg-muted-foreground/40"
        }`}
      />
      <span className="text-muted-foreground">{label}</span>
      {lastEventAt ? (
        <span className="text-muted-foreground/70">· last update {lastEventAt.toLocaleTimeString()}</span>
      ) : null}
    </div>
  );
}

/**
 * FR-POS-3: staff are not staring at the screen. Built with WebAudio rather
 * than an audio file so there is nothing to 404, and wrapped because browsers
 * refuse to play until the page has been interacted with.
 */
function announce(): void {
  try {
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    const context = new AudioCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);

    oscillator.start();
    oscillator.stop(context.currentTime + 0.35);
    oscillator.onended = () => void context.close();
  } catch {
    // No sound is a degraded queue, not a broken one.
  }
}
