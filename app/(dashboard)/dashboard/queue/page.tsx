import { QueueBoard } from "@/components/dashboard/queue/queue-board";
import { getQueue } from "@/lib/api-server";

export const metadata = { title: "Queue" };

export default async function QueuePage() {
  // Server-rendered so the queue is on screen before the stream connects.
  const orders = await getQueue();
  return <QueueBoard initialOrders={orders} />;
}
