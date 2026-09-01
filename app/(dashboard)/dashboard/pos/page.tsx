import { PageHeader } from "@/components/dashboard/shared/page-header";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { PosScreen } from "@/components/dashboard/pos/pos-screen";
import { API_BASE_URL } from "@/lib/api-client";
import type { PublicMenu } from "@/lib/menu";
import { WifiOff } from "lucide-react";

export const metadata = { title: "POS" };

export default async function PosPage() {
  const response = await fetch(`${API_BASE_URL}/api/menu`, { cache: "no-store" });
  const menu = response.ok ? ((await response.json()) as PublicMenu) : null;

  if (!menu) {
    return (
      <div className="bg-card ring-foreground/10 rounded-xl ring-1">
        <EmptyState
          icon={WifiOff}
          title="The menu did not load"
          hint="The counter cannot take an order without it. Check the connection and reload the page."
        />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader title="Take an order" subtitle="Tap what the customer wants, then charge them." />
      <PosScreen menu={menu} />
    </div>
  );
}
