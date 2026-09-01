import { notFound } from "next/navigation";

/**
 * Next's own 404 renders outside every layout, so a mistyped dashboard address
 * dropped somebody onto a bare "This page could not be found" with no nav and
 * no way back. This catch-all hands unmatched paths to the group's
 * `not-found.tsx`, which renders inside the shell.
 *
 * It is the lowest-priority match in the segment, so every real route above
 * still wins.
 */
export default function UnmatchedDashboardRoute(): never {
  notFound();
}
