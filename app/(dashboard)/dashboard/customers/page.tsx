import { PageHeader } from "@/components/dashboard/shared/page-header";
import { CustomersView } from "@/components/dashboard/customers/customers-view";

export const metadata = { title: "Customers" };

export default function CustomersPage() {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader title="Customers" subtitle="Everyone who has ordered, and what they spend." />
      <CustomersView />
    </div>
  );
}
