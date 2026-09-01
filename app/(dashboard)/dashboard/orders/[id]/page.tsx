import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OrderDetail } from "@/components/dashboard/orders/order-detail";
import { getSessionUser } from "@/lib/api-server";

export const metadata = { title: "Order" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, getSessionUser()]);
  if (!user) redirect("/login");

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Button size="sm" variant="ghost" className="self-start" asChild>
        <Link href="/dashboard/queue">
          <ArrowLeft aria-hidden="true" />
          Back to the queue
        </Link>
      </Button>
      <OrderDetail id={id} role={user.role} />
    </div>
  );
}
