import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/menu";
import { STATUS_META } from "@/lib/order-vocab";

/**
 * The only thing in the product that may render an order status. Every chip
 * carries an icon and a word as well as a hue, so nothing depends on colour
 * alone (WCAG 1.4.1) and a status is still legible on a glary counter tablet.
 */
const chip = cva(
  "inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        pending: "bg-st-pending-bg text-st-pending",
        unpaid: "bg-st-unpaid-bg text-st-unpaid",
        confirmed: "bg-st-confirmed-bg text-st-confirmed",
        preparing: "bg-st-preparing-bg text-st-preparing",
        ready: "bg-st-ready-bg text-st-ready",
        delivering: "bg-st-delivering-bg text-st-delivering",
        served: "bg-st-served-bg text-st-served",
        done: "bg-st-done-bg text-st-done",
        void: "bg-st-void-bg text-st-void",
      },
      size: {
        sm: "px-2 py-0.5 text-xs [&_svg]:size-3.5",
        md: "px-2.5 py-1 text-sm [&_svg]:size-4",
        lg: "px-3 py-1.5 text-base [&_svg]:size-5",
      },
    },
    defaultVariants: { tone: "void", size: "md" },
  },
);

export function StatusChip({
  status,
  size,
  className,
}: {
  status: OrderStatus;
  className?: string;
} & Pick<VariantProps<typeof chip>, "size">) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <span className={cn(chip({ tone: meta.tone, size }), className)}>
      <Icon aria-hidden="true" />
      {meta.label}
    </span>
  );
}
