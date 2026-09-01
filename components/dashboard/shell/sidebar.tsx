"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/api-client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BrandMark } from "@/components/dashboard/shell/brand-mark";
import { UserMenu } from "@/components/dashboard/shell/user-menu";
import { isActive, navFor } from "@/components/dashboard/shell/nav-items";
import { useStoredFlag } from "@/hooks/use-stored-flag";

const COLLAPSE_KEY = "popnsip.nav.collapsed";

/**
 * The counter tablet's left rail. Icon *and* label at all times when expanded —
 * an icon-only nav is a memory test, and the people using this are learning
 * the app during a lunch rush.
 *
 * The active item is marked three ways at once (a brand bar, a tinted ground,
 * and a darker label) because a single tint is easy to lose under glare.
 */
export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useStoredFlag(COLLAPSE_KEY);
  const groups = React.useMemo(() => navFor(user.role), [user.role]);

  return (
    <aside
      data-collapsed={collapsed ? "" : undefined}
      className={cn(
        "bg-sidebar border-border sticky top-0 hidden h-dvh shrink-0 flex-col border-r transition-[width] duration-200 md:flex",
        collapsed ? "w-[4.5rem]" : "w-60",
      )}
    >
      <div className="flex h-16 items-center gap-2.5 px-4">
        <BrandMark />
        {!collapsed ? (
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-tight">popNsip</span>
            <span className="text-muted-foreground block truncate text-xs">Staff</span>
          </span>
        ) : null}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2" aria-label="Sections">
        {groups.map((group, index) => (
          <div key={group.label ?? `group-${index}`} className="space-y-1">
            {group.label && !collapsed ? (
              <p className="text-muted-foreground px-3 pb-1 text-[0.6875rem] font-semibold tracking-wider uppercase">
                {group.label}
              </p>
            ) : null}
            {group.label && collapsed ? (
              <div className="border-border mx-2 mb-2 border-t" role="presentation" />
            ) : null}

            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              const link = (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                    active
                      ? "bg-brand-50 text-brand-800"
                      : "text-foreground/75 hover:bg-muted hover:text-foreground",
                    collapsed && "justify-center px-0",
                  )}
                >
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="bg-brand-500 absolute inset-y-2 left-0 w-[3px] rounded-r-full"
                    />
                  ) : null}
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  {collapsed ? <span className="sr-only">{item.label}</span> : null}
                </Link>
              );

              return collapsed ? (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label}
                    {item.hint ? ` — ${item.hint}` : ""}
                  </TooltipContent>
                </Tooltip>
              ) : (
                link
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-border space-y-1 border-t p-3">
        <UserMenu user={user} collapsed={collapsed} />
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          className={cn(
            "text-muted-foreground hover:bg-muted hover:text-foreground flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-5" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="size-5" aria-hidden="true" />
          )}
          {collapsed ? <span className="sr-only">Widen the menu</span> : <span>Narrow the menu</span>}
        </button>
      </div>
    </aside>
  );
}
