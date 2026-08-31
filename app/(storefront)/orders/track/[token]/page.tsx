import { notFound } from "next/navigation";

import { OrderTracker } from "@/components/storefront/order-tracker";
import { API_BASE_URL } from "@/lib/api-client";
import type { PaymentState, TrackedOrder } from "@/lib/menu";

export const metadata = { title: "Your order" };

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const response = await fetch(`${API_BASE_URL}/api/orders/track/${token}`, { cache: "no-store" });
  if (!response.ok) notFound();

  const initial = (await response.json()) as TrackedOrder;

  // Fetched here too, so the payment panel arrives with the page rather than
  // flashing in a moment later.
  const paymentResponse = await fetch(`${API_BASE_URL}/api/orders/track/${token}/payment`, {
    cache: "no-store",
  });
  const payment = paymentResponse.ok ? ((await paymentResponse.json()) as PaymentState) : null;

  return <OrderTracker token={token} initial={initial} payment={payment} />;
}
