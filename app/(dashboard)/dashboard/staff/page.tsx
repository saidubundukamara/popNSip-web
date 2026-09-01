import { redirect } from "next/navigation";

import { PageHeader } from "@/components/dashboard/shared/page-header";
import { StaffView } from "@/components/dashboard/staff/staff-view";
import { getSessionUser } from "@/lib/api-server";
import { roleAtLeast } from "@/lib/roles";

export const metadata = { title: "Staff" };

export default async function StaffPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  // The API is owner-only too; this just keeps a guessed URL from rendering a
  // screen that would only ever show an error.
  if (!roleAtLeast(user.role, "OWNER")) redirect("/dashboard");

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader title="Staff" subtitle="Who can sign in, and what they can do." />
      <StaffView currentUserId={user.id} />
    </div>
  );
}
