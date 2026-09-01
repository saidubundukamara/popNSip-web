import { PageHeader } from "@/components/dashboard/shared/page-header";
import { SettingsView } from "@/components/dashboard/settings/settings-view";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader title="Settings" subtitle="How the shop runs." />
      <SettingsView />
    </div>
  );
}
