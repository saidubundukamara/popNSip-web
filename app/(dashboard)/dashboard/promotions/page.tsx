import Link from "next/link";
import { Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { EmptyState } from "@/components/dashboard/shared/empty-state";

export const metadata = { title: "Promotions" };

/**
 * Discount codes are a feature, not a screen — there is no promotion in the
 * database yet, so there is nothing here to list. Rather than mock one up,
 * this points at the discount that does work today: a manager can take money
 * off any single order from its Charges tab, and it lands as a named
 * adjustment on the bill.
 */
export default function PromotionsPage() {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader title="Promotions" subtitle="Discounts and offers." />
      <div className="bg-card ring-foreground/10 rounded-xl ring-1">
        <EmptyState
          icon={Tag}
          title="Reusable discount codes are not built yet"
          hint="You can already take money off a single order: open it, go to Charges, and add a negative amount with a name the customer will understand. It shows on their bill."
          action={
            <Button size="touch" variant="outline" asChild>
              <Link href="/dashboard/orders">Find an order</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
