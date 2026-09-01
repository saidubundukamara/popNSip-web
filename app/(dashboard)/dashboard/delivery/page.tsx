import { PageHeader } from "@/components/dashboard/shared/page-header";
import { QueueBoard } from "@/components/dashboard/queue/queue-board";

export const metadata = { title: "Delivery" };

/**
 * Deliveries only, from the moment they are accepted to the moment they are
 * handed over. It is a filtered view of the same live orders rather than a
 * separate concept — there is no rider or route model behind it, and
 * pretending otherwise would be a screen that lies.
 */
export default function DeliveryPage() {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader
        title="Delivery"
        subtitle="Orders going out to an address."
      />
      <QueueBoard
        lanes={["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"]}
        types={["DELIVERY"]}
        emptyTitle="No deliveries right now"
        emptyHint="Delivery orders show up here the moment they are accepted, with the address on the card."
      />
    </div>
  );
}
