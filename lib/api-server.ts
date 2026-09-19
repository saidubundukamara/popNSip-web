import { cache } from "react";
import { cookies } from "next/headers";

import type { SessionUser } from "@/lib/api-client";
import { API_ORIGIN } from "@/lib/api-origin";
import type { AnalyticsOverview, Category, StaffOrder } from "@/lib/menu";

/**
 * Server-component API access. `credentials: 'include'` means nothing on the
 * server, so the incoming cookie header is forwarded by hand — this is the
 * only way a server component sees the staff session.
 */
async function serverApiFetch<T>(path: string): Promise<T | null> {
  const cookieHeader = (await cookies()).toString();

  const response = await fetch(`${API_ORIGIN}${path}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    // Session state must never be served from a cache.
    cache: "no-store",
  });

  if (!response.ok) return null;
  return (await response.json()) as T;
}

/**
 * The signed-in user, or null. The API is the authority, not the cookie.
 *
 * Wrapped in React's `cache` because the shell asks this and so does most
 * pages inside it — a single dashboard render was making two round trips to
 * `/api/auth/me` for the same answer, and three when a stale cookie sent it
 * through the login redirect as well.
 *
 * This does not weaken the "session state is never served from a cache" rule:
 * `cache` is scoped to one server render pass and is thrown away with it, so
 * the next request still asks the API. Deactivating an account still takes
 * effect on the very next navigation.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const body = await serverApiFetch<{ user: SessionUser }>("/api/auth/me");
  return body?.user ?? null;
});

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

/** The dashboard's opening numbers, fetched server-side. */
export async function getAnalytics(): Promise<AnalyticsOverview | null> {
  return serverApiFetch<AnalyticsOverview>("/api/staff/analytics/overview?period=today");
}
