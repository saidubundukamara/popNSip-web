import { AnalyticsView } from "@/components/dashboard/analytics/analytics-view";
import { getAnalytics } from "@/lib/api-server";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  // Today's numbers are server-rendered, so the page opens with figures on it
  // rather than a spinner — FR-STAT-1 is read on a phone, often on 3G.
  const initial = await getAnalytics();

  if (!initial) {
    return <p className="text-muted-foreground text-sm">The numbers could not be loaded.</p>;
  }

  return <AnalyticsView initial={initial} />;
}
