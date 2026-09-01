import { redirect } from "next/navigation";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MobileNav } from "@/components/dashboard/shell/mobile-nav";
import { OrderAlertsProvider } from "@/components/dashboard/shell/order-alerts";
import { Sidebar } from "@/components/dashboard/shell/sidebar";
import { Topbar } from "@/components/dashboard/shell/topbar";
import { getSessionUser } from "@/lib/api-server";

/**
 * The dashboard shell. Unlike the middleware, this asks the API who the user
 * actually is — a cookie that exists but no longer resolves to an active
 * account ends up here and is redirected out.
 *
 * `data-density="touch"` is the whole reason the staff side can share
 * components with the customer storefront: the shared primitives stay compact
 * for the phone-sized shop, and this scope lifts every control inside the
 * dashboard to a 44px floor for a thumb on a counter tablet.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <TooltipProvider delayDuration={300}>
      <OrderAlertsProvider>
        <div data-density="touch" className="bg-background flex min-h-full">
          <Sidebar user={user} />

          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar user={user} />
            <main className="min-w-0 flex-1 px-4 pt-5 pb-24 md:px-6 md:pb-8">{children}</main>
          </div>

          <MobileNav user={user} />
        </div>
        <Toaster position="top-right" />
      </OrderAlertsProvider>
    </TooltipProvider>
  );
}
