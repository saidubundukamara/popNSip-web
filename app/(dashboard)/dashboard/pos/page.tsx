import { PosScreen } from "@/components/dashboard/pos/pos-screen";
import { API_BASE_URL } from "@/lib/api-client";
import type { PublicMenu } from "@/lib/menu";

export const metadata = { title: "POS" };

export default async function PosPage() {
  const response = await fetch(`${API_BASE_URL}/api/menu`, { cache: "no-store" });
  const menu = response.ok ? ((await response.json()) as PublicMenu) : null;

  if (!menu) {
    return <p className="text-muted-foreground text-sm">The menu could not be loaded.</p>;
  }

  return <PosScreen menu={menu} />;
}
