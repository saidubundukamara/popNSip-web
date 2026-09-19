/**
 * Browser-side API client.
 *
 * Paths are relative: the browser only ever talks to its own origin, and the
 * `/api/*` rewrite in `next.config.ts` forwards to Express. The staff session
 * cookie is therefore first-party on the web domain. Server-side code cannot
 * use a relative URL; it uses `API_ORIGIN` from `lib/api-origin.ts`.
 */

export const API_BASE_URL = "";

export type ApiIssue = { path: string; message: string };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly issues: ApiIssue[] = [],
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ErrorBody = {
  error?: { code?: string; message?: string; issues?: ApiIssue[]; requestId?: string };
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (body as ErrorBody | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "UNKNOWN",
      error?.message ?? "Something went wrong.",
      error?.issues ?? [],
      error?.requestId,
    );
  }

  return body as T;
}

export type StaffRole = "OWNER" | "MANAGER" | "STAFF";

export type SessionUser = {
  id: string;
  branchId: string;
  email: string;
  name: string;
  role: StaffRole;
};

export const login = (email: string, password: string) =>
  apiFetch<{ user: SessionUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const logout = () => apiFetch<void>("/api/auth/logout", { method: "POST" });
