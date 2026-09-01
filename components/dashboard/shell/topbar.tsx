import type { SessionUser } from "@/lib/api-client";
import { BrandMark } from "@/components/dashboard/shell/brand-mark";
import { LiveBadge } from "@/components/dashboard/shell/live-badge";
import { OrderSearch } from "@/components/dashboard/shell/order-search";
import { SoundControl } from "@/components/dashboard/shell/sound-control";
import { UserMenu } from "@/components/dashboard/shell/user-menu";
import { roleAtLeast } from "@/lib/roles";

/**
 * Sticky across every page, because the two things it carries — how fresh the
 * board is, and whether an order is waiting — matter wherever you happen to
 * be standing in the app.
 */
export function Topbar({ user }: { user: SessionUser }) {
  const canSearchOrders = roleAtLeast(user.role, "MANAGER");

  return (
    <header className="bg-background/85 border-border sticky top-0 z-30 border-b backdrop-blur-sm">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <div className="flex items-center gap-2.5 md:hidden">
          <BrandMark className="size-8 rounded-lg" />
          <span className="text-sm font-semibold tracking-tight">popNsip</span>
        </div>

        {canSearchOrders ? (
          <OrderSearch className="hidden max-w-md flex-1 md:block" />
        ) : (
          <div className="flex-1" />
        )}

        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <LiveBadge className="hidden sm:flex" />
          <SoundControl />
          <div className="md:hidden">
            <UserMenu user={user} collapsed />
          </div>
        </div>
      </div>
    </header>
  );
}
