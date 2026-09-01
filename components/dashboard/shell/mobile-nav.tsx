"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/api-client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { isActive, navFor, primaryFor } from "@/components/dashboard/shell/nav-items";

/**
 * The phone bar. FR-POS-9 makes the phone a first-class target and the old
 * header simply squeezed four text links, a brand block and a user block into
 * one flex row with no responsive classes at all.
 *
 * Four destinations plus "More": five is the ceiling for a bottom bar, and a
 * cashier's whole nav fits without the sheet ever being needed.
 */
export function MobileNav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const primary = primaryFor(user.role);
  const groups = navFor(user.role);

  return (
    <nav
      aria-label="Main"
      className="bg-surface border-border fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {primary.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[0.6875rem] font-medium",
              active ? "text-brand-800" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}

      <Sheet>
        <SheetTrigger className="text-muted-foreground flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[0.6875rem] font-medium">
          <Menu className="size-5" aria-hidden="true" />
          More
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Everything else</SheetTitle>
            <SheetDescription>The rest of the dashboard.</SheetDescription>
          </SheetHeader>
          <div className="space-y-5 px-4 pb-6">
            {groups.map((group, index) => (
              <div key={group.label ?? `group-${index}`} className="space-y-1">
                {group.label ? (
                  <p className="text-muted-foreground px-1 pb-1 text-[0.6875rem] font-semibold tracking-wider uppercase">
                    {group.label}
                  </p>
                ) : null}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium",
                        isActive(pathname, item.href)
                          ? "bg-brand-50 text-brand-800"
                          : "hover:bg-muted",
                      )}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
