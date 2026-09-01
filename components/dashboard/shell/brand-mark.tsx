import { CupSoda } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The one place the brand orange appears at full strength. `--brand-500` is
 * the colour sampled from the reference designs; it is legible here because
 * nothing sits on it but a white glyph at 5:1.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "bg-brand-500 grid size-9 shrink-0 place-items-center rounded-xl text-white shadow-sm",
        className,
      )}
    >
      <CupSoda className="size-5" aria-hidden="true" />
    </span>
  );
}
