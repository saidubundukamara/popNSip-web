"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { itemCountOf, subtotalOf, useCart, useCartHydrated } from "@/lib/cart-store";
import { formatMinor } from "@/lib/format";

/**
 * The persistent cart bar. It reads from localStorage, which the server cannot
 * see, so it renders nothing until the store has hydrated — otherwise the
 * server HTML and the first client render disagree and React discards the tree.
 */
export function CartBar({ currency }: { currency: string }) {
  const lines = useCart((state) => state.lines);
  const hydrated = useCartHydrated();

  if (!hydrated || lines.length === 0) return null;

  const count = itemCountOf(lines);

  return (
    <div className="sticky bottom-0 z-20 border-t bg-background/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium">
            {count} {count === 1 ? "item" : "items"}
          </p>
          <p className="text-muted-foreground text-xs">{formatMinor(subtotalOf(lines), currency)}</p>
        </div>
        <Button asChild>
          <Link href="/checkout">Review order</Link>
        </Button>
      </div>
    </div>
  );
}
