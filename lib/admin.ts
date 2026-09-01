import { apiFetch, type StaffRole } from "@/lib/api-client";
import type { OrderStatus, StaffOrder } from "@/lib/menu";

/**
 * The back-office API surface: settings, staff accounts, customers, payments
 * and the WhatsApp handover queue. Kept apart from `lib/menu.ts`, which is
 * already the shared spine for the storefront and the counter.
 */

// ─── settings ─────────────────────────────────────────────────────────────

export type OpeningWindow = { open: string; close: string };
export type OpeningHours = Partial<Record<DayKey, OpeningWindow[]>>;
export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const DAY_ORDER: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export type BranchSettings = {
  id: string;
  name: string;
  address: string;
  phoneE164: string;
  timezone: string;
  currency: string;
  openingHours: OpeningHours;
  isOpenOverride: boolean | null;
  botEnabled: boolean;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  dineInEnabled: boolean;
  isOpenNow: boolean;
};

export const fetchSettings = () =>
  apiFetch<{ settings: BranchSettings }>("/api/staff/settings");

export const updateSettings = (patch: Partial<Omit<BranchSettings, "id" | "isOpenNow" | "timezone" | "currency">>) =>
  apiFetch<{ settings: BranchSettings }>("/api/staff/settings", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

// ─── staff accounts ───────────────────────────────────────────────────────

export type StaffAccount = {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  isActive: boolean;
  lastLoginAt?: string | null;
};

export const fetchStaff = () => apiFetch<{ users: StaffAccount[] }>("/api/staff/users");

export const createStaff = (body: {
  email: string;
  name: string;
  role: StaffRole;
  password: string;
}) => apiFetch<{ user: StaffAccount }>("/api/staff/users", { method: "POST", body: JSON.stringify(body) });

export const updateStaff = (
  id: string,
  patch: Partial<{ name: string; role: StaffRole; isActive: boolean; password: string }>,
) =>
  apiFetch<{ user: StaffAccount }>(`/api/staff/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

// ─── customers ────────────────────────────────────────────────────────────

export type Customer = {
  id: string;
  phoneE164: string;
  name: string | null;
  lastAddress: string | null;
  orderCount: number;
  lifetimeSpendMinor: number;
  createdAt: string;
  updatedAt: string;
};

export const fetchCustomers = (search?: string) =>
  apiFetch<{ customers: Customer[] }>(
    `/api/staff/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`,
  );

export const fetchCustomer = (id: string) =>
  apiFetch<{ customer: Customer & { orders: StaffOrder[] } }>(`/api/staff/customers/${id}`);

// ─── payments ─────────────────────────────────────────────────────────────

export type PaymentRow = {
  id: string;
  method: "CASH" | "MOBILE_MONEY";
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "EXPIRED" | "REFUNDED";
  amountMinor: number;
  tenderedMinor: number | null;
  changeMinor: number | null;
  ussdCode: string | null;
  settledAt: string | null;
  createdAt: string;
  order: { id: string; reference: string; type: StaffOrder["type"]; currency: string };
};

export const fetchPayments = (params: Record<string, string> = {}) =>
  apiFetch<{ payments: PaymentRow[] }>(
    `/api/staff/payments${Object.keys(params).length ? `?${new URLSearchParams(params)}` : ""}`,
  );

// ─── whatsapp ─────────────────────────────────────────────────────────────

export type WaConversation = {
  id: string;
  phoneE164: string;
  needsHuman: boolean;
  lastMessageAt: string | null;
  customer?: { name: string | null } | null;
};

export type WaMessage = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  body: string | null;
  status: string;
  createdAt: string;
};

export const fetchConversations = () =>
  apiFetch<{ conversations: WaConversation[] }>("/api/staff/whatsapp/conversations");

export const fetchConversation = (id: string) =>
  apiFetch<{ conversation: WaConversation; messages: WaMessage[] }>(
    `/api/staff/whatsapp/conversations/${id}`,
  );

/**
 * `release` hands the thread back to the bot. Leaving it held keeps the bot
 * quiet while a person is still typing, which is what you want mid-exchange.
 */
export const replyToConversation = (id: string, body: string, release = false) =>
  apiFetch<{ sent: boolean; released: boolean }>(
    `/api/staff/whatsapp/conversations/${id}/reply`,
    { method: "POST", body: JSON.stringify({ body, release }) },
  );

export const syncCatalog = () =>
  apiFetch<{ total: number; synced: number; failed: unknown[] }>(
    "/api/staff/whatsapp/catalog/sync",
    { method: "POST" },
  );

/** Re-exported so back-office screens do not have to reach into lib/menu. */
export type { OrderStatus, StaffOrder };
