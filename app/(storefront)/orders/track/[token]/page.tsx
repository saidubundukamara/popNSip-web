import { notFound } from "next/navigation";

import { OrderTracker } from "@/components/storefront/order-tracker";
import { API_BASE_URL } from "@/lib/api-client";
import type { TrackedOrder } from "@/lib/menu";

export const metadata = { title: "Your order" };

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const response = await fetch(`${API_BASE_URL}/api/orders/track/${token}`, { cache: "no-store" });
  if (!response.ok) notFound();

  const initial = (await response.json()) as TrackedOrder;

  return <OrderTracker token={token} initial={initial} />;
}
