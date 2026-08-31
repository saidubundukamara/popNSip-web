"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { MenuItem, ModifierGroup } from "@/lib/menu";

/**
 * The cart (FR-SHOP-3): persisted to localStorage so a reload does not lose it.
 *
 * It stores ids and a *display* price only. The server re-prices everything
 * from the database on submit (FR-SHOP-7), so what is kept here can go stale
 * without becoming a wrong charge — the worst case is the customer being told
 * the total moved, which is the correct outcome.
 */

export type CartLine = {
  /** Stable per configuration, so the same item+options stacks rather than duplicating. */
  key: string;
  menuItemId: string;
  variantId: string | null;
  quantity: number;
  notes: string | null;
  /** Display only. */
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  unitPriceMinor: number;
  modifiers: { id: string; name: string; priceMinor: number }[];
};

type CartState = {
  lines: CartLine[];
  tableCode: string | null;
  add: (line: Omit<CartLine, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  setTableCode: (code: string | null) => void;
};

const keyFor = (line: Omit<CartLine, "key">): string =>
  [line.menuItemId, line.variantId ?? "-", [...line.modifiers.map((m) => m.id)].sort().join("+"), line.notes ?? ""].join(
    "|",
  );

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      tableCode: null,

      add: (line) =>
        set((state) => {
          const key = keyFor(line);
          const existing = state.lines.find((candidate) => candidate.key === key);

          if (existing) {
            return {
              lines: state.lines.map((candidate) =>
                candidate.key === key
                  ? { ...candidate, quantity: Math.min(99, candidate.quantity + line.quantity) }
                  : candidate,
              ),
            };
          }

          return { lines: [...state.lines, { ...line, key }] };
        }),

      setQuantity: (key, quantity) =>
        set((state) => ({
          lines:
            quantity < 1
              ? state.lines.filter((line) => line.key !== key)
              : state.lines.map((line) => (line.key === key ? { ...line, quantity: Math.min(99, quantity) } : line)),
        })),

      remove: (key) => set((state) => ({ lines: state.lines.filter((line) => line.key !== key) })),
      clear: () => set({ lines: [] }),
      setTableCode: (code) => set({ tableCode: code }),
    }),
    { name: "popnsip.cart", version: 1 },
  ),
);

/**
 * Whether the persisted cart has been read back from localStorage yet.
 *
 * The server cannot see localStorage, so any component that renders cart
 * contents must wait for this — otherwise the server HTML and the first client
 * render disagree and React throws the tree away. Subscribed through
 * useSyncExternalStore rather than an effect, so there is no extra render and
 * no state set during mount.
 */
export const useCartHydrated = (): boolean =>
  useSyncExternalStore(
    (onChange) => useCart.persist.onFinishHydration(onChange),
    () => useCart.persist.hasHydrated(),
    () => false,
  );

/** Per-unit price including modifiers. Display only — the server decides. */
export const unitPriceOf = (line: CartLine): number =>
  line.unitPriceMinor + line.modifiers.reduce((sum, modifier) => sum + modifier.priceMinor, 0);

export const lineTotalOf = (line: CartLine): number => unitPriceOf(line) * line.quantity;

export const subtotalOf = (lines: CartLine[]): number =>
  lines.reduce((total, line) => total + lineTotalOf(line), 0);

export const itemCountOf = (lines: CartLine[]): number =>
  lines.reduce((total, line) => total + line.quantity, 0);

/** Build a cart line from an item sheet selection. */
export function toCartLine(
  item: MenuItem,
  variantId: string | null,
  chosen: Record<string, string[]>,
  quantity: number,
  notes: string | null,
): Omit<CartLine, "key"> {
  const variant = item.variants.find((candidate) => candidate.id === variantId) ?? null;

  const modifiers = item.modifierGroups.flatMap((group: ModifierGroup) =>
    group.modifiers
      .filter((modifier) => (chosen[group.id] ?? []).includes(modifier.id))
      .map((modifier) => ({ id: modifier.id, name: modifier.name, priceMinor: modifier.priceMinor })),
  );

  return {
    menuItemId: item.id,
    variantId: variant?.id ?? null,
    quantity,
    notes,
    name: item.name,
    variantName: variant?.name ?? null,
    imageUrl: item.imageUrl,
    unitPriceMinor: variant?.priceMinor ?? item.basePriceMinor,
    modifiers,
  };
}
