import {
  Bike,
  CircleCheck,
  CircleDollarSign,
  CookingPot,
  HandPlatter,
  PackageCheck,
  Sparkles,
  Ban,
  Undo2,
  FileText,
  type LucideIcon,
} from "lucide-react";

import type { OrderStatus, StaffOrder } from "@/lib/menu";

/**
 * Everything the interface says about an order lives here, so a status can
 * never be worded one way on a card and another way in a table. The state
 * machine itself is the server's (`order_status_service`); this is only how we
 * speak about it.
 */

export type StatusTone =
  | "pending"
  | "unpaid"
  | "confirmed"
  | "preparing"
  | "ready"
  | "delivering"
  | "served"
  | "done"
  | "void";

type StatusMeta = { label: string; tone: StatusTone; icon: LucideIcon };

export const STATUS_META: Record<OrderStatus, StatusMeta> = {
  DRAFT: { label: "Draft", tone: "void", icon: FileText },
  AWAITING_PAYMENT: { label: "Not paid", tone: "unpaid", icon: CircleDollarSign },
  PENDING_CONFIRMATION: { label: "New", tone: "pending", icon: Sparkles },
  CONFIRMED: { label: "Accepted", tone: "confirmed", icon: CircleCheck },
  PREPARING: { label: "Cooking", tone: "preparing", icon: CookingPot },
  READY: { label: "Ready", tone: "ready", icon: PackageCheck },
  OUT_FOR_DELIVERY: { label: "On the way", tone: "delivering", icon: Bike },
  SERVED: { label: "Served", tone: "served", icon: HandPlatter },
  COMPLETED: { label: "Done", tone: "done", icon: CircleCheck },
  CANCELLED: { label: "Cancelled", tone: "void", icon: Ban },
  REFUNDED: { label: "Refunded", tone: "void", icon: Undo2 },
};

/**
 * A button is labelled with what the tap *does*, not with the state it lands
 * in. "Preparing" is a noun on a control that starts cooking (FR-POS-4).
 */
const ACTION_VERBS: Record<OrderStatus, { label: string; icon: LucideIcon }> = {
  CONFIRMED: { label: "Accept order", icon: CircleCheck },
  PREPARING: { label: "Send to kitchen", icon: CookingPot },
  READY: { label: "Food is ready", icon: PackageCheck },
  OUT_FOR_DELIVERY: { label: "Hand to rider", icon: Bike },
  SERVED: { label: "Served to table", icon: HandPlatter },
  COMPLETED: { label: "Finish order", icon: CircleCheck },
  DRAFT: { label: "Move to draft", icon: FileText },
  PENDING_CONFIRMATION: { label: "Send back to new", icon: Sparkles },
  AWAITING_PAYMENT: { label: "Wait for payment", icon: CircleDollarSign },
  CANCELLED: { label: "Cancel order", icon: Ban },
  REFUNDED: { label: "Give money back", icon: Undo2 },
};

/**
 * Literal class strings per tone. A template like `text-st-${tone}` would only
 * work by accident — Tailwind generates what it can see in the source, so the
 * names have to be written out somewhere it will look.
 */
export const TONE_TEXT: Record<StatusTone, string> = {
  pending: "text-st-pending",
  unpaid: "text-st-unpaid",
  confirmed: "text-st-confirmed",
  preparing: "text-st-preparing",
  ready: "text-st-ready",
  delivering: "text-st-delivering",
  served: "text-st-served",
  done: "text-st-done",
  void: "text-st-void",
};

export const TONE_VAR: Record<StatusTone, string> = {
  pending: "var(--st-pending)",
  unpaid: "var(--st-unpaid)",
  confirmed: "var(--st-confirmed)",
  preparing: "var(--st-preparing)",
  ready: "var(--st-ready)",
  delivering: "var(--st-delivering)",
  served: "var(--st-served)",
  done: "var(--st-done)",
  void: "var(--st-void)",
};

export function actionFor(target: OrderStatus) {
  return ACTION_VERBS[target];
}

export const TYPE_LABELS: Record<StaffOrder["type"], string> = {
  DELIVERY: "Delivery",
  PICKUP: "Pickup",
  DINE_IN: "Dine in",
  WALK_IN: "Walk-in",
};

/**
 * How long an order in each status is allowed to sit before the card starts
 * calling for attention, in minutes. These are service targets, not rules —
 * nothing is enforced, the rail just fills.
 */
export const AGE_TARGET_MINUTES: Partial<Record<OrderStatus, number>> = {
  PENDING_CONFIRMATION: 2,
  AWAITING_PAYMENT: 10,
  CONFIRMED: 3,
  PREPARING: 12,
  READY: 5,
  OUT_FOR_DELIVERY: 25,
  SERVED: 10,
};

/** The lanes the live board shows, in the order work moves through them. */
export const OPEN_LANES: OrderStatus[] = [
  "PENDING_CONFIRMATION",
  "AWAITING_PAYMENT",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "SERVED",
];

/** What the kitchen screen shows: cooking work only, no money. */
export const KITCHEN_LANES: OrderStatus[] = ["CONFIRMED", "PREPARING", "READY"];

/**
 * Money already settled against an order, from the payments it carries.
 *
 * `payments` is optional here on purpose: the POS create route returns the new
 * order without including its (necessarily empty) payment relation, so a
 * required array is a lie the type system was happy to tell right up until a
 * cashier pressed Charge.
 */
export function settledMinorOf(order: { payments?: StaffOrder["payments"] }): number {
  return (order.payments ?? [])
    .filter((payment) => payment.status === "SUCCEEDED")
    .reduce((total, payment) => total + payment.amountMinor, 0);
}

export function balanceDueOf(order: {
  payments?: StaffOrder["payments"];
  totalMinor: number;
}): number {
  return Math.max(0, order.totalMinor - settledMinorOf(order));
}
