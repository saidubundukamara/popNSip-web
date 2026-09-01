import { PageHeader } from "@/components/dashboard/shared/page-header";
import { QueueBoard } from "@/components/dashboard/queue/queue-board";
import { KITCHEN_LANES } from "@/lib/order-vocab";

export const metadata = { title: "Kitchen" };

/**
 * The cooking screen. Money is deliberately absent — the person at the stove
 * needs the food and the clock and nothing else, and a screen read from two
 * metres away cannot afford anything it does not need.
 */
export default function KitchenPage() {
  return (
    <div className="flex min-w-0 flex-col gap-5 text-[1.0625rem]">
      <PageHeader
        title="Kitchen"
        subtitle="What is being cooked right now."
      />
      <QueueBoard
        lanes={KITCHEN_LANES}
        emptyTitle="Nothing to cook"
        emptyHint="Accepted orders appear here as soon as the counter sends them through."
      />
    </div>
  );
}
