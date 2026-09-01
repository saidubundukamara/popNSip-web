"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { logout, type SessionUser } from "@/lib/api-client";
import { roleLabel } from "@/lib/roles";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

/**
 * Replaces the static two-line name block in the old header, which printed the
 * raw enum ("manager") and offered no way to change a password even though the
 * API has had that endpoint since Phase 1.
 */
export function UserMenu({ user, collapsed }: { user: SessionUser; collapsed?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function signOut() {
    startTransition(async () => {
      try {
        await logout();
      } catch {
        // The cookie is cleared server-side either way; a failed call here
        // must not strand somebody on a screen they are trying to leave.
      }
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className={cn(
          "hover:bg-muted flex h-12 w-full items-center gap-3 rounded-lg px-2 text-left transition-colors",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          collapsed && "justify-center px-0",
        )}
      >
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-brand-100 text-brand-800 text-xs font-semibold">
            {initialsOf(user.name)}
          </AvatarFallback>
        </Avatar>
        {!collapsed ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{user.name}</span>
            <span className="text-muted-foreground block truncate text-xs">
              {roleLabel(user.role)}
            </span>
          </span>
        ) : (
          <span className="sr-only">
            {user.name}, {roleLabel(user.role)}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium">{user.name}</span>
          <span className="text-muted-foreground block text-xs">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => toast.info("Password change is coming with Settings.")}>
          <KeyRound aria-hidden="true" />
          Change password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={signOut} disabled={pending}>
          <LogOut aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
