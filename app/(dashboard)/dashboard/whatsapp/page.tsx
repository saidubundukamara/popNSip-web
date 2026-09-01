import { PageHeader } from "@/components/dashboard/shared/page-header";
import { WhatsAppView } from "@/components/dashboard/whatsapp/whatsapp-view";

export const metadata = { title: "WhatsApp" };

export default function WhatsAppPage() {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader title="WhatsApp" subtitle="Customers the bot handed over to a person." />
      <WhatsAppView />
    </div>
  );
}
