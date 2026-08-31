import { cookies } from "next/headers";

import { API_BASE_URL, type SessionUser } from "@/lib/api-client";
import type { Category, StaffOrder } from "@/lib/menu";

/**
 * Server-component API access. `credentials: 'include'` means nothing on the
 * server, so the incoming cookie header is forwarded by hand — this is the
 * only way a server component sees the staff session.
 */
async function serverApiFetch<T>(path: string): Promise<T | null> {
  const cookieHeader = (await cookies()).toString();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    // Session state must never be served from a cache.
    cache: "no-store",
  });

  if (!response.ok) return null;
  return (await response.json()) as T;
}

/** The signed-in user, or null. The API is the authority, not the cookie. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const body = await serverApiFetch<{ user: SessionUser }>("/api/auth/me");
  return body?.user ?? null;
}

/** The manager's menu, fetched on the server so the page arrives populated. */
export async function getManagedMenu(): Promise<Category[]> {
  const body = await serverApiFetch<{ categories: Category[] }>("/api/staff/menu");
  return body?.categories ?? [];
}

/** The open queue, fetched on the server so the page arrives populated. */
export async function getQueue(): Promise<StaffOrder[]> {
  const body = await serverApiFetch<{ orders: StaffOrder[] }>("/api/staff/orders");
  return body?.orders ?? [];
}
