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
