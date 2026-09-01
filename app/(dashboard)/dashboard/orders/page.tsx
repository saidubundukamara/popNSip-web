import { Suspense } from "react";

import { PageHeader } from "@/components/dashboard/shared/page-header";
import { OrderSearchView } from "@/components/dashboard/orders/order-search-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Orders" };

export default function OrdersPage() {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader
        title="Orders"
        subtitle="Every order, open and finished. Search by number, name or phone."
      />
      {/* useSearchParams needs a boundary; the skeleton is the same height as
          the filters so the list does not jump when it resolves. */}
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <OrderSearchView />
      </Suspense>
    </div>
  );
}
