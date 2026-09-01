import type { StaffRole } from "@/lib/api-client";

/**
 * Mirrors `roleAtLeast` in the server's `config/constants.ts`, which is the
 * only place the hierarchy is defined over there. This copy exists so the nav
 * can leave out doors the user cannot open — a cashier who taps Reports and
 * gets a 403 learns that the app is unreliable.
 *
 * It is not authorisation. The API re-checks every request; nothing here is
 * trusted.
 */
const RANK: Record<StaffRole, number> = {
  STAFF: 1,
  MANAGER: 2,
  OWNER: 3,
};

export function roleAtLeast(role: StaffRole, minimum: StaffRole): boolean {
  return RANK[role] >= RANK[minimum];
}

/** "Manager", not "manager" — the header printed the raw enum until now. */
export function roleLabel(role: StaffRole): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}
