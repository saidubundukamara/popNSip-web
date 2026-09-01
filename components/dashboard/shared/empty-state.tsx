import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * An empty screen is an instruction, not a shrug. Say what this place is for
 * and offer the one action that fills it — "Nothing here" teaches nobody
 * anything, and the people using this have no manual to fall back on.
 */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  size = "md",
  className,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "sm" ? "gap-1.5 px-4 py-6" : "gap-2 px-6 py-12",
        className,
      )}
    >
      {Icon ? (
        <Icon
          aria-hidden="true"
          className={cn("text-muted-foreground/50", size === "sm" ? "size-5" : "size-8")}
        />
      ) : null}
      <p className={cn("font-medium", size === "sm" ? "text-sm" : "text-base")}>{title}</p>
      {hint ? (
        <p className="text-muted-foreground max-w-sm text-sm text-balance">{hint}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
