import { redirect } from "next/navigation";

import { PageHeader } from "@/components/dashboard/shared/page-header";
import { TodayView } from "@/components/dashboard/home/today-view";
import { getAnalytics, getSessionUser } from "@/lib/api-server";
import { formatDay } from "@/lib/format";
import { roleAtLeast } from "@/lib/roles";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // A cashier has no use for a summary and every use for the board. Sending
  // them straight to work is the whole of their onboarding.
  if (!roleAtLeast(user.role, "MANAGER")) redirect("/dashboard/queue");

  const overview = await getAnalytics();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Good day, ${user.name.split(" ")[0]}`}
        subtitle={formatDay(new Date())}
      />
      <TodayView overview={overview} />
    </div>
  );
}
