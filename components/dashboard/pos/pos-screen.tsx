"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ItemSheet } from "@/components/storefront/item-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMinor } from "@/lib/format";
import { createPosOrder, fromPriceMinor, type MenuItem, type PublicMenu } from "@/lib/menu";

type Line = {
  key: string;
  menuItemId: string;
  variantId: string | null;
  modifiers: { id: string; name: string; priceMinor: number }[];
  quantity: number;
  notes: string | null;
  name: string;
  variantName: string | null;
  unitPriceMinor: number;
};

/**
 * Walk-in entry (FR-POS-6). The item sheet is the storefront's, unchanged, so
 * a variant or modifier rule can never be enforced one way at the counter and
 * another way online — and pricing_service checks it a third time server-side.
 */
export function PosScreen({ menu }: { menu: PublicMenu }) {
  const router = useRouter();
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const subtotal = lines.reduce(
    (total, line) =>
      total + (line.unitPriceMinor + line.modifiers.reduce((sum, m) => sum + m.priceMinor, 0)) * line.quantity,
    0,
  );

  const categories = menu.categories.filter((category) => category.items.length > 0);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (lines.length === 0) return;

    const data = new FormData(event.currentTarget);
    const phone = String(data.get("phone") ?? "").trim();
    const name = String(data.get("name") ?? "").trim();

    setSubmitting(true);
    try {
      const { order } = await createPosOrder({
        lines: lines.map((line) => ({
          menuItemId: line.menuItemId,
          ...(line.variantId ? { variantId: line.variantId } : {}),
          modifierIds: line.modifiers.map((modifier) => modifier.id),
          quantity: line.quantity,
          ...(line.notes ? { notes: line.notes } : {}),
        })),
        ...(phone || name ? { customer: { ...(name ? { name } : {}), ...(phone ? { phone } : {}) } } : {}),
      });

      toast.success(`Order ${order.reference} entered`);
      setLines([]);
      router.push("/dashboard/queue");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not enter the order.");
      setSubmitting(false);
    }
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
      <section className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Take an order</h1>

        {categories.map((category) => (
          <div key={category.id}>
            <h2 className="mb-2 text-sm font-medium">{category.name}</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {category.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  className="bg-card hover:bg-muted/50 flex min-h-16 flex-col justify-between rounded-md border p-2 text-left"
                >
                  <span className="text-sm leading-tight font-medium">{item.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {formatMinor(fromPriceMinor(item), menu.branch.currency)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <aside className="bg-card sticky top-6 flex flex-col gap-4 rounded-lg border p-4">
        <h2 className="text-sm font-medium">This order</h2>

        {lines.length === 0 ? (
          <p className="text-muted-foreground text-sm">Tap an item to start.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {lines.map((line) => (
              <li key={line.key} className="flex items-start gap-2 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">
                    {line.quantity}× {line.name}
                  </span>
                  {line.variantName ? <span className="text-muted-foreground"> · {line.variantName}</span> : null}
                  {line.modifiers.length > 0 ? (
                    <span className="text-muted-foreground block text-xs">
                      {line.modifiers.map((modifier) => modifier.name).join(", ")}
                    </span>
                  ) : null}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${line.name}`}
                  onClick={() => setLines((current) => current.filter((candidate) => candidate.key !== line.key))}
                >
                  ×
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={submit} className="flex flex-col gap-3 border-t pt-4">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Total</span>
            <span className="tabular-nums">{formatMinor(subtotal, menu.branch.currency)}</span>
          </div>

          <Input name="phone" placeholder="Phone (optional)" aria-label="Customer phone" inputMode="tel" />
          <Input name="name" placeholder="Customer name" aria-label="Customer name" />
          <p className="text-muted-foreground -mt-1 text-xs">
            A customer record is keyed by phone, so a name is only kept if you enter a number too.
          </p>

          <Button type="submit" disabled={lines.length === 0 || submitting}>
            {submitting ? "Entering…" : "Enter order"}
          </Button>
          <p className="text-muted-foreground text-xs">
            The order is confirmed straight away and joins the queue.
          </p>
        </form>
      </aside>

      {selected ? (
        <ItemSheet
          key={selected.id}
          item={selected}
          currency={menu.branch.currency}
          onOpenChange={(open: boolean) => !open && setSelected(null)}
          onAdd={(line) => {
            setLines((current) => [
              ...current,
              {
                key: `${line.menuItemId}-${current.length}-${Date.now()}`,
                menuItemId: line.menuItemId,
                variantId: line.variantId,
                modifiers: line.modifiers,
                quantity: line.quantity,
                notes: line.notes,
                name: line.name,
                variantName: line.variantName,
                unitPriceMinor: line.unitPriceMinor,
              },
            ]);
            setSelected(null);
          }}
        />
      ) : null}
    </div>
  );
}
