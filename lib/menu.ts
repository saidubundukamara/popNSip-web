import { API_BASE_URL, apiFetch } from "@/lib/api-client";

/** Shapes the API returns. Kept here so both surfaces agree on one definition. */

export type Modifier = {
  id: string;
  name: string;
  priceMinor: number;
  isAvailable: boolean;
  sortOrder: number;
};

export type ModifierGroup = {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  modifiers: Modifier[];
};

export type ItemVariant = {
  id: string;
  name: string;
  priceMinor: number;
  isAvailable: boolean;
  sortOrder: number;
};

export type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  basePriceMinor: number;
  imageUrl: string | null;
  isAvailable: boolean;
  sortOrder: number;
  variants: ItemVariant[];
  modifierGroups: ModifierGroup[];
};

export type Category = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  items: MenuItem[];
};

export type Branch = {
  id: string;
  name: string;
  currency: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  dineInEnabled: boolean;
};

export type PublicMenu = { branch: Branch; categories: Category[] };

/**
 * The price an item starts at. With variants the base price is a placeholder —
 * the cheapest variant is what the customer can actually pay.
 */
export function fromPriceMinor(item: MenuItem): number {
  if (item.variants.length === 0) return item.basePriceMinor;
  return Math.min(...item.variants.map((variant) => variant.priceMinor));
}

export const fetchManagedMenu = () => apiFetch<{ categories: Category[] }>("/api/staff/menu");

// ─── staff mutations ──────────────────────────────────────────────────────

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export const createCategory = (input: { name: string; description?: string | null }) =>
  apiFetch<{ category: Category }>("/api/staff/menu/categories", json("POST", input));

export const updateCategory = (id: string, input: { name?: string; description?: string | null; isActive?: boolean }) =>
  apiFetch<{ category: Category }>(`/api/staff/menu/categories/${id}`, json("PATCH", input));

export const archiveCategory = (id: string) =>
  apiFetch<{ category: Category }>(`/api/staff/menu/categories/${id}/archive`, json("POST"));

export const deleteCategory = (id: string) =>
  apiFetch<void>(`/api/staff/menu/categories/${id}`, json("DELETE"));

export const reorderCategories = (ids: string[]) =>
  apiFetch<void>("/api/staff/menu/categories/reorder", json("POST", { ids }));

export const createItem = (input: {
  categoryId: string;
  name: string;
  description?: string | null;
  basePriceMinor: number;
}) => apiFetch<{ item: MenuItem }>("/api/staff/menu/items", json("POST", input));

export const updateItem = (
  id: string,
  input: { name?: string; description?: string | null; basePriceMinor?: number; categoryId?: string },
) => apiFetch<{ item: MenuItem }>(`/api/staff/menu/items/${id}`, json("PATCH", input));

export const setItemAvailability = (id: string, isAvailable: boolean) =>
  apiFetch<{ item: MenuItem }>(`/api/staff/menu/items/${id}/availability`, json("PATCH", { isAvailable }));

export const archiveItem = (id: string) =>
  apiFetch<{ item: MenuItem }>(`/api/staff/menu/items/${id}/archive`, json("POST"));

export const deleteItem = (id: string) => apiFetch<void>(`/api/staff/menu/items/${id}`, json("DELETE"));

export const reorderItems = (categoryId: string, ids: string[]) =>
  apiFetch<void>("/api/staff/menu/items/reorder", json("POST", { categoryId, ids }));

export const fetchItem = (id: string) => apiFetch<{ item: MenuItem }>(`/api/staff/menu/items/${id}`);

export const createVariant = (itemId: string, input: { name: string; priceMinor: number }) =>
  apiFetch<{ variant: ItemVariant }>(`/api/staff/menu/items/${itemId}/variants`, json("POST", input));

export const updateVariant = (id: string, input: { name?: string; priceMinor?: number; isAvailable?: boolean }) =>
  apiFetch<{ variant: ItemVariant }>(`/api/staff/menu/variants/${id}`, json("PATCH", input));

export const removeVariant = (id: string) => apiFetch<void>(`/api/staff/menu/variants/${id}`, json("DELETE"));

export const createModifierGroup = (itemId: string, input: { name: string; minSelect: number; maxSelect: number }) =>
  apiFetch<{ group: ModifierGroup }>(`/api/staff/menu/items/${itemId}/modifier-groups`, json("POST", input));

export const updateModifierGroup = (id: string, input: { name?: string; minSelect?: number; maxSelect?: number }) =>
  apiFetch<{ group: ModifierGroup }>(`/api/staff/menu/modifier-groups/${id}`, json("PATCH", input));

export const deleteModifierGroup = (id: string) =>
  apiFetch<void>(`/api/staff/menu/modifier-groups/${id}`, json("DELETE"));

export const createModifier = (groupId: string, input: { name: string; priceMinor: number }) =>
  apiFetch<{ modifier: Modifier }>(`/api/staff/menu/modifier-groups/${groupId}/modifiers`, json("POST", input));

export const removeModifier = (id: string) => apiFetch<void>(`/api/staff/menu/modifiers/${id}`, json("DELETE"));

/** Multipart, so it bypasses apiFetch's JSON content type. */
export async function uploadItemImage(itemId: string, file: File): Promise<MenuItem> {
  const form = new FormData();
  form.append("image", file);

  const response = await fetch(`${API_BASE_URL}/api/staff/menu/items/${itemId}/image`, {
    method: "POST",
    credentials: "include",
    body: form,
  });

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (body as { error?: { message?: string } } | null)?.error;
    throw new Error(error?.message ?? "The image could not be uploaded.");
  }

  return (body as { item: MenuItem }).item;
}

// ─── ordering ─────────────────────────────────────────────────────────────

export type OrderType = "DELIVERY" | "PICKUP" | "DINE_IN";
export type PaymentMethod = "MOBILE_MONEY" | "CASH";

export type PublicSettings = {
  branch: { id: string; name: string; address: string; phoneE164: string; currency: string; timezone: string };
  isOpen: boolean;
  orderTypes: { delivery: boolean; pickup: boolean; dineIn: boolean };
};

export type PlacedOrder = {
  id: string;
  reference: string;
  status: string;
  totalMinor: number;
  currency: string;
  trackingToken: string;
};

export type CreateOrderBody = {
  type: OrderType;
  paymentMethod: PaymentMethod;
  lines: { menuItemId: string; variantId?: string; modifierIds: string[]; quantity: number; notes?: string }[];
  customer: { name: string; phone: string };
  deliveryAddress?: string;
  deliveryNotes?: string;
  tableCode?: string;
};

/**
 * The idempotency key is generated once per checkout attempt and reused across
 * retries, so a dropped connection cannot produce a second order (FR-SHOP-10).
 */
export const placeOrder = (body: CreateOrderBody, idempotencyKey: string) =>
  apiFetch<{ order: PlacedOrder; replayed: boolean }>("/api/orders", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(body),
  });

export type TrackedOrder = {
  order: {
    reference: string;
    status: string;
    type: string;
    placedAt: string;
    subtotalMinor: number;
    adjustmentsMinor: number;
    totalMinor: number;
    currency: string;
    deliveryAddress: string | null;
    items: {
      name: string;
      variantName: string | null;
      quantity: number;
      lineTotalMinor: number;
      notes: string | null;
      modifiers: { name: string; priceMinor: number }[];
    }[];
  };
  settledMinor: number;
  balanceDueMinor: number;
  events: { toStatus: string; createdAt: string }[];
};

export const fetchTrackedOrder = (token: string) => apiFetch<TrackedOrder>(`/api/orders/track/${token}`);

// ─── staff orders ─────────────────────────────────────────────────────────

export type OrderStatus =
  | "DRAFT"
  | "AWAITING_PAYMENT"
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "SERVED"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

export type StaffOrder = {
  id: string;
  reference: string;
  status: OrderStatus;
  type: "DELIVERY" | "PICKUP" | "DINE_IN" | "WALK_IN";
  channel: string;
  placedAt: string;
  subtotalMinor: number;
  adjustmentsMinor: number;
  totalMinor: number;
  currency: string;
  deliveryAddress: string | null;
  deliveryNotes: string | null;
  customer: { name: string | null; phoneE164: string } | null;
  table: { code: string; label: string } | null;
  items: {
    id: string;
    itemNameSnapshot: string;
    variantNameSnapshot: string | null;
    quantity: number;
    lineTotalMinor: number;
    notes: string | null;
    modifiers: { nameSnapshot: string; priceMinor: number }[];
  }[];
  /**
   * Absent on the order returned by the POS create route, which does not
   * include the relation. Read it through `settledMinorOf`/`balanceDueOf`.
   */
  payments?: { id: string; status: string; amountMinor: number; method: string }[];
};

export const fetchQueue = () => apiFetch<{ orders: StaffOrder[] }>("/api/staff/orders");

export const searchOrders = (params: Record<string, string>) =>
  apiFetch<{ orders: StaffOrder[] }>(`/api/staff/orders?${new URLSearchParams({ ...params, open: "false" })}`);

export const setOrderStatus = (id: string, status: OrderStatus, reason?: string) =>
  apiFetch<{ order: StaffOrder; changed: boolean }>(`/api/staff/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
  });

export const addAdjustment = (id: string, label: string, amountMinor: number) =>
  apiFetch<{ order: StaffOrder }>(`/api/staff/orders/${id}/adjustments`, {
    method: "POST",
    body: JSON.stringify({ label, amountMinor }),
  });

export const recordCash = (id: string, amountMinor: number, tenderedMinor?: number) =>
  apiFetch<{ changeMinor: number; balanceDueMinor: number }>(`/api/staff/orders/${id}/payments`, {
    method: "POST",
    body: JSON.stringify({ amountMinor, ...(tenderedMinor ? { tenderedMinor } : {}) }),
  });

export const cancelOrder = (id: string, reason: string) =>
  apiFetch<{ order: StaffOrder }>(`/api/staff/orders/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

export const createPosOrder = (body: {
  /** Defaults to WALK_IN server-side when omitted. */
  type?: StaffOrder["type"];
  tableCode?: string;
  lines: { menuItemId: string; variantId?: string; modifierIds: string[]; quantity: number; notes?: string }[];
  customer?: { name?: string; phone?: string };
}) => apiFetch<{ order: StaffOrder }>("/api/staff/orders", { method: "POST", body: JSON.stringify(body) });

/**
 * The detail route returns more than the list route: the adjustments and the
 * status history, plus payment fields the queue never needs.
 */
// `Omit` on payments, not an intersection: intersecting two array types
// keeps the narrower element and the extra payment fields vanish.
export type StaffOrderDetail = Omit<StaffOrder, "payments"> & {
  adjustments: { id: string; label: string; amountMinor: number; createdAt: string }[];
  statusEvents: {
    id: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    actorType: string;
    reason: string | null;
    createdAt: string;
  }[];
  payments?: {
    id: string;
    status: string;
    amountMinor: number;
    method: string;
    ussdCode?: string | null;
    tenderedMinor?: number | null;
    changeMinor?: number | null;
    settledAt?: string | null;
    createdAt?: string;
  }[];
};

/** One order, with the server's own view of what may happen to it next. */
export const fetchOrder = (id: string) =>
  apiFetch<{
    order: StaffOrderDetail;
    settledMinor: number;
    balanceDueMinor: number;
    allowedTransitions: OrderStatus[];
  }>(`/api/staff/orders/${id}`);

export const refundOrder = (id: string, amountMinor: number, reason: string) =>
  apiFetch<{ order: StaffOrder }>(`/api/staff/orders/${id}/refund`, {
    method: "POST",
    body: JSON.stringify({ amountMinor, reason }),
  });

/** The amount is the server's to decide — it charges the outstanding balance. */
export const requestMobileMoney = (id: string, phone?: string) =>
  apiFetch<{ ussdCode: string | null; amountMinor: number }>(
    `/api/staff/orders/${id}/payment-request`,
    { method: "POST", body: JSON.stringify(phone ? { phone } : {}) },
  );

/** Which transitions the POS should offer, mirroring the server's table. */
export function nextActions(status: OrderStatus, type: StaffOrder["type"]): OrderStatus[] {
  switch (status) {
    case "PENDING_CONFIRMATION":
      return ["CONFIRMED"];
    case "AWAITING_PAYMENT":
      return [];
    case "CONFIRMED":
      return ["PREPARING"];
    case "PREPARING":
      return ["READY"];
    case "READY":
      if (type === "DELIVERY") return ["OUT_FOR_DELIVERY"];
      if (type === "DINE_IN") return ["SERVED"];
      return ["COMPLETED"];
    case "OUT_FOR_DELIVERY":
    case "SERVED":
      return ["COMPLETED"];
    default:
      return [];
  }
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: "Draft",
  AWAITING_PAYMENT: "Awaiting payment",
  PENDING_CONFIRMATION: "New",
  CONFIRMED: "Accepted",
  PREPARING: "Preparing",
  READY: "Ready",
  OUT_FOR_DELIVERY: "Out for delivery",
  SERVED: "Served",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

// ─── payments ─────────────────────────────────────────────────────────────

export type PaymentState = {
  status: OrderStatus;
  settledMinor: number;
  balanceDueMinor: number;
  isPaid: boolean;
  pending: { ussdCode: string | null; amountMinor: number } | null;
};

export const fetchPaymentState = (token: string) =>
  apiFetch<PaymentState>(`/api/orders/track/${token}/payment`);

export const startPayment = (token: string) =>
  apiFetch<{ ussdCode: string | null; amountMinor: number; currency: string }>(
    `/api/orders/track/${token}/pay`,
    { method: "POST" },
  );

// ─── analytics ────────────────────────────────────────────────────────────

export type AnalyticsPeriod = "today" | "7d" | "30d" | "custom";

export type DateRange = { fromLocalDate: string; toLocalDateExclusive: string; timezone: string };

export type AnalyticsOverview = {
  summary: {
    revenueMinor: number;
    orderCount: number;
    /** Null when there were no orders — shown as an em dash, never a zero. */
    averageOrderValueMinor: number | null;
    range: DateRange;
  };
  topItems: { menuItemId: string; name: string; quantity: number; revenueMinor: number }[];
  hours: { hour: number; orderCount: number; revenueMinor: number }[];
  splits: {
    paymentMethod: { key: string; orderCount: number; valueMinor: number }[];
    orderType: { key: string; orderCount: number; valueMinor: number }[];
  };
  range: DateRange;
};

export const fetchAnalytics = (period: AnalyticsPeriod, from?: string, to?: string) =>
  apiFetch<AnalyticsOverview>(
    `/api/staff/analytics/overview?${new URLSearchParams({
      period,
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    })}`,
  );

/**
 * The sold-out board (FR-MENU-5). Available to any signed-in staff member,
 * unlike the rest of the menu API — running out of something is discovered at
 * the counter and has to come off the storefront that minute.
 */
export type AvailabilityCategory = {
  id: string;
  name: string;
  items: { id: string; name: string; isAvailable: boolean }[];
};

export const fetchAvailability = () =>
  apiFetch<{ categories: AvailabilityCategory[] }>("/api/staff/menu/availability");
