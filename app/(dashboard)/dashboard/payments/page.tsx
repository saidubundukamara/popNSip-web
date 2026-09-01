import { PageHeader } from "@/components/dashboard/shared/page-header";
import { PaymentsView } from "@/components/dashboard/payments/payments-view";

export const metadata = { title: "Payments" };

export default function PaymentsPage() {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader title="Payments" subtitle="Every payment against every order." />
      <PaymentsView />
    </div>
  );
}
