/**
 * Money is integer minor units everywhere, including on the wire. It becomes
 * a string exactly here and nowhere else — a component that does its own
 * division is a rounding bug waiting for a busy Friday.
 */
export function formatMinor(minor: number, currency = "SLE"): string {
  const symbol = currency === "SLE" ? "Le" : currency;
  const major = minor / 100;
  const hasFraction = minor % 100 !== 0;

  return `${symbol} ${major.toLocaleString("en-GB", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Signed, for adjustments and modifier deltas: "+Le 5", "Free". */
export function formatDelta(minor: number, currency = "SLE"): string {
  if (minor === 0) return "Free";
  return `${minor > 0 ? "+" : "−"}${formatMinor(Math.abs(minor), currency)}`;
}

/**
 * Cloudinary delivery transform. `f_auto` picks the format the browser
 * supports and `q_auto` the quality, which is most of FR-MENU-6 on the
 * connection where it matters.
 */
export function imageUrl(url: string | null | undefined, width: number): string | null {
  if (!url) return null;
  const marker = "/upload/";
  const index = url.indexOf(marker);
  if (index === -1) return url;
  return `${url.slice(0, index + marker.length)}w_${width},f_auto,q_auto/${url.slice(index + marker.length)}`;
}

/**
 * The branch timezone. Analytics resolves ranges server-side in Postgres
 * (CLAUDE.md), so this is display only — never date arithmetic.
 */
export const BRANCH_TZ = "Africa/Freetown";

/** "14:32" — order times on cards, timelines and receipts. */
export function formatClock(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BRANCH_TZ,
  });
}

/** "31 Aug" / "31 Aug 2025" once the year differs from today's. */
export function formatDay(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
    timeZone: BRANCH_TZ,
  });
}

/** "31 Aug, 14:32" for tables and detail headers. */
export function formatDateTime(value: string | Date): string {
  return `${formatDay(value)}, ${formatClock(value)}`;
}

/**
 * How long an order has been waiting. Spoken the way staff say it — "4m",
 * "1h 04m" — and always rendered beside the age rail so the rail's colour is
 * never the only signal.
 */
export function formatElapsed(sinceMs: number): string {
  const minutes = Math.max(0, Math.floor(sinceMs / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${String(minutes % 60).padStart(2, "0")}m`;
}
