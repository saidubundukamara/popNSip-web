"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toCartLine, useCart, type CartLine } from "@/lib/cart-store";
import { formatDelta, formatMinor, imageUrl } from "@/lib/format";
import type { MenuItem, ModifierGroup } from "@/lib/menu";

/**
 * The item sheet (FR-SHOP-2). Selection rules are enforced here before "Add to
 * cart" is enabled: exactly one variant when the item has variants, and every
 * group's minSelect satisfied without exceeding its maxSelect.
 *
 * The same rules are enforced again server-side by pricing_service — this is
 * the courtesy, not the guarantee.
 */
export function ItemSheet({
  item,
  currency,
  onOpenChange,
  onAdd,
  addLabel = "Add to cart",
}: {
  item: MenuItem;
  currency: string;
  onOpenChange: (open: boolean) => void;
  /**
   * Where the configured line goes. Omitted on the storefront, where it joins
   * the customer's persisted cart; supplied by the POS, which keeps its own
   * in-memory order and must not touch a customer's cart.
   */
  onAdd?: (line: Omit<CartLine, "key">) => void;
  /**
   * A customer adds to a cart; a cashier adds to a ticket. Same control, same
   * rules, different room — and the word on the button has to match the room
   * the person is standing in.
   */
  addLabel?: string;
}) {
  // The parent keys this component by item id, so a different item remounts
  // with fresh state — no reset effect, and no chance of a stale selection
  // surviving into the next item.
  const [variantId, setVariantId] = useState<string | null>(item.variants[0]?.id ?? null);
  const [chosen, setChosen] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const add = useCart((state) => state.add);

  const unitPriceMinor = useMemo(() => {
    const base = variantId
      ? (item.variants.find((variant) => variant.id === variantId)?.priceMinor ?? item.basePriceMinor)
      : item.basePriceMinor;

    const extras = item.modifierGroups.reduce((total, group) => {
      const ids = chosen[group.id] ?? [];
      return (
        total +
        group.modifiers
          .filter((modifier) => ids.includes(modifier.id))
          .reduce((sum, modifier) => sum + modifier.priceMinor, 0)
      );
    }, 0);

    return base + extras;
  }, [item, variantId, chosen]);

  const unmetGroups = item.modifierGroups.filter(
    (group) => (chosen[group.id] ?? []).length < group.minSelect,
  );
  const needsVariant = item.variants.length > 0 && !variantId;
  const canAdd = !needsVariant && unmetGroups.length === 0;

  const toggleModifier = (group: ModifierGroup, modifierId: string) => {
    setChosen((current) => {
      const selected = current[group.id] ?? [];
      const isSelected = selected.includes(modifierId);

      if (isSelected) {
        return { ...current, [group.id]: selected.filter((id) => id !== modifierId) };
      }

      // A single-select group swaps rather than refusing — refusing to accept a
      // tap the customer clearly meant is the more annoying failure.
      if (group.maxSelect === 1) return { ...current, [group.id]: [modifierId] };
      if (selected.length >= group.maxSelect) return current;

      return { ...current, [group.id]: [...selected, modifierId] };
    });
  };

  const hero = imageUrl(item.imageUrl, 800);

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt="" className="bg-muted -mt-2 h-44 w-full rounded-md object-cover" />
        ) : null}

        <SheetHeader className="px-0">
          <SheetTitle>{item.name}</SheetTitle>
          {item.description ? <SheetDescription>{item.description}</SheetDescription> : null}
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-4">
          {item.variants.length > 0 ? (
            <fieldset>
              <legend className="flex items-center gap-2 text-sm font-medium">
                Choose one
                <Badge variant="secondary" className="text-[10px]">
                  Required
                </Badge>
              </legend>

              <div className="mt-3 flex flex-col gap-2">
                {item.variants.map((variant) => (
                  <label
                    key={variant.id}
                    className="hover:bg-muted/50 flex cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-sm has-[:checked]:border-foreground"
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="variant"
                        value={variant.id}
                        checked={variantId === variant.id}
                        onChange={() => setVariantId(variant.id)}
                        className="accent-foreground size-4"
                      />
                      {variant.name}
                    </span>
                    <span className="text-muted-foreground">{formatMinor(variant.priceMinor, currency)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {item.modifierGroups.map((group) => {
            const selected = chosen[group.id] ?? [];
            const atLimit = selected.length >= group.maxSelect;

            return (
              <fieldset key={group.id}>
                <legend className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {group.name}
                  {group.minSelect > 0 ? (
                    <Badge variant="secondary" className="text-[10px]">
                      Required
                    </Badge>
                  ) : null}
                  <span className="text-muted-foreground text-xs font-normal">
                    {describeSelection(group)}
                  </span>
                </legend>

                <div className="mt-3 flex flex-col gap-2">
                  {group.modifiers.map((modifier) => {
                    const isSelected = selected.includes(modifier.id);
                    const isBlocked = !isSelected && atLimit && group.maxSelect > 1;

                    return (
                      <label
                        key={modifier.id}
                        className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-sm has-[:checked]:border-foreground ${
                          isBlocked ? "cursor-not-allowed opacity-50" : "hover:bg-muted/50 cursor-pointer"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <input
                            type={group.maxSelect === 1 ? "radio" : "checkbox"}
                            name={`group-${group.id}`}
                            checked={isSelected}
                            disabled={isBlocked}
                            onChange={() => toggleModifier(group, modifier.id)}
                            className="accent-foreground size-4"
                          />
                          {modifier.name}
                        </span>
                        <span className="text-muted-foreground">{formatDelta(modifier.priceMinor, currency)}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          <div className="flex flex-col gap-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Anything to tell the kitchen?
            </label>
            <input
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={280}
              placeholder="e.g. no onions"
              className="border-input bg-background h-10 rounded-md border px-3 text-sm"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1 rounded-md border">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Reduce quantity"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                −
              </Button>
              <span aria-live="polite" className="w-8 text-center text-sm tabular-nums">
                {quantity}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Increase quantity"
                onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              >
                +
              </Button>
            </div>

            <Button
              type="button"
              disabled={!canAdd}
              className="flex-1"
              onClick={() => {
                const line = toCartLine(item, variantId, chosen, quantity, notes.trim() || null);
                if (onAdd) onAdd(line);
                else add(line);
                onOpenChange(false);
              }}
            >
              {addLabel} · {formatMinor(unitPriceMinor * quantity, currency)}
            </Button>
          </div>

          {!canAdd ? (
            <p role="status" className="text-muted-foreground -mt-3 text-xs">
              {needsVariant
                ? "Choose an option to continue."
                : `Choose ${unmetGroups.map((group) => group.name.toLowerCase()).join(" and ")} to continue.`}
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function describeSelection(group: ModifierGroup): string {
  if (group.minSelect === 0 && group.maxSelect === 1) return "Optional · choose up to 1";
  if (group.minSelect === group.maxSelect) return `Choose ${group.minSelect}`;
  if (group.minSelect === 0) return `Optional · choose up to ${group.maxSelect}`;
  return `Choose ${group.minSelect}–${group.maxSelect}`;
}
