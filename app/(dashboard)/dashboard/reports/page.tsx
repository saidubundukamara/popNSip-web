import { PageHeader } from "@/components/dashboard/shared/page-header";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { AnalyticsView } from "@/components/dashboard/analytics/analytics-view";
import { getAnalytics } from "@/lib/api-server";
import { BarChart3 } from "lucide-react";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const initial = await getAnalytics();

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader title="Reports" subtitle="How the business is doing." />
      {initial ? (
        <AnalyticsView initial={initial} />
      ) : (
        <div className="bg-card ring-foreground/10 rounded-xl ring-1">
          <EmptyState
            icon={BarChart3}
            title="The numbers did not load"
            hint="Reload the page. If it keeps happening, the API may be down."
          />
        </div>
      )}
    </div>
  );
}
