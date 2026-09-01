import { PageHeader } from "@/components/dashboard/shared/page-header";
import { QueueBoard } from "@/components/dashboard/queue/queue-board";
import { OPEN_LANES } from "@/lib/order-vocab";

export const metadata = { title: "Queue" };

export default function QueuePage() {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader
        title="Queue"
        subtitle="Every order still being worked on. New ones arrive on their own."
      />
      <QueueBoard
        lanes={OPEN_LANES}
        emptyTitle="Nothing waiting"
        emptyHint="New orders land here by themselves — from the shop, from WhatsApp, and from the POS. You do not need to refresh."
      />
    </div>
  );
}
