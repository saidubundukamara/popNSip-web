"use client";

import * as React from "react";
import {
  ChevronDown,
  Loader2,
  Minus,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ItemSheet } from "@/components/storefront/item-sheet";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { FilterChip } from "@/components/dashboard/shared/filter-chips";
import { Money } from "@/components/dashboard/shared/money";
import { TenderPanel } from "@/components/dashboard/pos/tender-panel";
import { useOrderAlerts } from "@/components/dashboard/shell/order-alerts";
import { formatMinor, imageUrl } from "@/lib/format";
import {
  createPosOrder,
  fromPriceMinor,
  type MenuItem,
  type PublicMenu,
  type StaffOrder,
} from "@/lib/menu";
import { balanceDueOf } from "@/lib/order-vocab";

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

const ORDER_TYPES = [
  { value: "WALK_IN", label: "Walk-in" },
  { value: "DINE_IN", label: "Dine in" },
  { value: "PICKUP", label: "Pickup" },
] as const;

function lineTotal(line: Line): number {
  const extras = line.modifiers.reduce((sum, modifier) => sum + modifier.priceMinor, 0);
  return (line.unitPriceMinor + extras) * line.quantity;
}

/**
 * The counter (FR-POS-6, FR-POS-7).
 *
 * The version this replaces was a form in the shape of a POS: a scrolling list
 * of text buttons, no search, no way to change a quantity without removing the
 * line and re-adding it, no order type or table even though the API accepts
 * both — and no way to take money at all. It rang an order up and then sent
 * the cashier to the queue to find it again, with a customer still standing
 * there.
 *
 * Photographs are the important part. Recognition beats recall for anybody,
 * and for staff who are not confident readers it is the difference between
 * serving and searching.
 *
 * The item sheet is still the storefront's, unchanged, so a variant or
 * modifier rule can never be enforced one way at the counter and another way
 * online — and `pricing_service` checks it a third time server-side. Nothing
 * here is the price; the total shown is a courtesy until the server says so.
 */
export function PosScreen({ menu }: { menu: PublicMenu }) {
  const { refresh, noteOwnOrder } = useOrderAlerts();
  const [selected, setSelected] = React.useState<MenuItem | null>(null);
  const [lines, setLines] = React.useState<Line[]>([]);
  const [category, setCategory] = React.useState<string>("ALL");
  const [term, setTerm] = React.useState("");
  const [orderType, setOrderType] = React.useState<(typeof ORDER_TYPES)[number]["value"]>("WALK_IN");
  const [tableCode, setTableCode] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [name, setName] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [placed, setPlaced] = React.useState<StaffOrder | null>(null);
  const ticketRef = React.useRef<HTMLElement>(null);

  const currency = menu.branch.currency;
  const categories = menu.categories.filter((entry) => entry.items.length > 0);
  const subtotal = lines.reduce((total, line) => total + lineTotal(line), 0);

  const query = term.trim().toLowerCase();
  const visible = categories
    .filter((entry) => category === "ALL" || entry.id === category)
    .map((entry) => ({
      ...entry,
      items: query
        ? entry.items.filter((item) => item.name.toLowerCase().includes(query))
        : entry.items,
    }))
    .filter((entry) => entry.items.length > 0);

  function setQuantity(key: string, quantity: number) {
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => line.key !== key)
        : current.map((line) => (line.key === key ? { ...line, quantity } : line)),
    );
  }

  function startFresh() {
    setLines([]);
    setPlaced(null);
    setPhone("");
    setName("");
    setTableCode("");
    setTerm("");
    setOrderType("WALK_IN");
  }

  async function place() {
    if (lines.length === 0) return;
    setSubmitting(true);
    try {
      const { order } = await createPosOrder({
        type: orderType,
        ...(tableCode.trim() ? { tableCode: tableCode.trim() } : {}),
        lines: lines.map((line) => ({
          menuItemId: line.menuItemId,
          ...(line.variantId ? { variantId: line.variantId } : {}),
          modifierIds: line.modifiers.map((modifier) => modifier.id),
          quantity: line.quantity,
          ...(line.notes ? { notes: line.notes } : {}),
        })),
        ...(phone.trim() || name.trim()
          ? {
              customer: {
                ...(name.trim() ? { name: name.trim() } : {}),
                ...(phone.trim() ? { phone: phone.trim() } : {}),
              },
            }
          : {}),
      });

      // The cashier is holding this order; chiming at them about it would
      // train them to ignore the sound that matters.
      noteOwnOrder(order.id);
      // The kitchen should see it now, not when somebody next opens the queue.
      refresh();
      setPlaced(order);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not enter the order.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[1fr_20rem] xl:grid-cols-[1fr_23rem]">
      <section className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search the menu"
              aria-label="Search the menu"
              className="pl-9"
            />
          </div>
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          <FilterChip active={category === "ALL"} onClick={() => setCategory("ALL")}>
            Everything
          </FilterChip>
          {categories.map((entry) => (
            <FilterChip
              key={entry.id}
              active={category === entry.id}
              onClick={() => setCategory(entry.id)}
            >
              {entry.name}
            </FilterChip>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="bg-card ring-foreground/10 rounded-xl ring-1">
            <EmptyState
              icon={Search}
              title={query ? `Nothing matches “${term}”` : "Nothing on the menu"}
              hint={
                query
                  ? "Try a shorter word, or clear the search to see everything."
                  : "Items appear here once a manager adds them to the menu."
              }
              action={
                query ? (
                  <Button size="touch" variant="outline" onClick={() => setTerm("")}>
                    Clear the search
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          visible.map((entry) => (
            <div key={entry.id} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold">{entry.name}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {entry.items.map((item) => (
                  <ItemTile
                    key={item.id}
                    item={item}
                    currency={currency}
                    onPick={() => setSelected(item)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <aside
        ref={ticketRef}
        className="bg-card ring-foreground/10 flex min-w-0 flex-col rounded-xl ring-1 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6.5rem)]"
      >
        {placed ? (
          <div className="flex flex-col gap-4 overflow-y-auto p-4">
            <h2 className="font-semibold">Take payment</h2>
            <TenderPanel
              order={placed}
              dueMinor={balanceDueOf(placed)}
              onSettled={refresh}
              onDone={startFresh}
            />
          </div>
        ) : (
          <>
            <header className="flex items-center justify-between gap-2 p-4 pb-2">
              <h2 className="font-semibold">This order</h2>
              {lines.length > 0 ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="density-compact"
                  onClick={() => setLines([])}
                >
                  <Trash2 aria-hidden="true" />
                  Clear
                </Button>
              ) : null}
            </header>

            <div className="min-h-24 flex-1 overflow-y-auto px-4">
              {lines.length === 0 ? (
                <EmptyState
                  size="sm"
                  icon={UtensilsCrossed}
                  title="Nothing added yet"
                  hint="Tap a picture on the left to put it on the ticket."
                />
              ) : (
                <ul className="divide-border divide-y">
                  {lines.map((line) => (
                    <li key={line.key} className="flex items-start gap-2 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{line.name}</p>
                        {line.variantName || line.modifiers.length > 0 ? (
                          <p className="text-muted-foreground text-xs">
                            {[line.variantName, ...line.modifiers.map((m) => m.name)]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        ) : null}
                        {line.notes ? (
                          <p className="text-xs italic">“{line.notes}”</p>
                        ) : null}

                        <div className="mt-1.5 flex items-center gap-1.5">
                          <Button
                            size="icon-sm"
                            variant="outline"
                            className="density-compact size-8"
                            aria-label={`One less ${line.name}`}
                            onClick={() => setQuantity(line.key, line.quantity - 1)}
                          >
                            <Minus aria-hidden="true" />
                          </Button>
                          <span
                            className="w-6 text-center text-sm font-semibold tabular-nums"
                            aria-live="polite"
                          >
                            {line.quantity}
                          </span>
                          <Button
                            size="icon-sm"
                            variant="outline"
                            className="density-compact size-8"
                            aria-label={`One more ${line.name}`}
                            onClick={() => setQuantity(line.key, line.quantity + 1)}
                          >
                            <Plus aria-hidden="true" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Money
                          minor={lineTotal(line)}
                          currency={currency}
                          className="text-sm font-semibold"
                        />
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="density-compact size-8"
                          aria-label={`Take ${line.name} off the ticket`}
                          onClick={() => setQuantity(line.key, 0)}
                        >
                          <X aria-hidden="true" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-border flex flex-col gap-3 border-t p-4">
              <fieldset className="flex flex-col gap-2">
                <legend className="sr-only">Order type</legend>
                <div className="grid grid-cols-3 gap-1.5">
                  {ORDER_TYPES.map((option) => (
                    <Button
                      key={option.value}
                      size="touch"
                      variant={orderType === option.value ? "default" : "outline"}
                      className="px-2 text-sm"
                      aria-pressed={orderType === option.value}
                      onClick={() => setOrderType(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </fieldset>

              {orderType === "DINE_IN" ? (
                <Input
                  value={tableCode}
                  onChange={(event) => setTableCode(event.target.value)}
                  placeholder="Table number"
                  aria-label="Table number"
                  inputMode="numeric"
                />
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Phone"
                  aria-label="Customer phone"
                  inputMode="tel"
                />
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Name"
                  aria-label="Customer name"
                />
              </div>
              <p className="text-muted-foreground -mt-1 text-xs">
                Optional. A customer is remembered by phone number, so a name on its own is not
                kept.
              </p>

              <div className="flex items-baseline justify-between">
                <span className="font-semibold">Total</span>
                <Money
                  minor={subtotal}
                  currency={currency}
                  className="text-2xl font-bold tracking-tight"
                />
              </div>

              <Button
                size="touch-lg"
                className="w-full"
                disabled={lines.length === 0 || submitting}
                onClick={() => void place()}
              >
                {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                Charge {lines.length > 0 ? formatMinor(subtotal, currency) : ""}
              </Button>
            </div>
          </>
        )}
      </aside>

      {lines.length > 0 && !placed ? (
        <div className="fixed inset-x-0 bottom-14 z-30 px-4 pb-[env(safe-area-inset-bottom)] lg:hidden">
          <button
            type="button"
            onClick={() => ticketRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="bg-brand-700 flex h-14 w-full items-center justify-between gap-3 rounded-xl px-5 text-white shadow-lg"
          >
            <span className="text-base font-semibold">
              {lines.reduce((count, line) => count + line.quantity, 0)} on the ticket
            </span>
            <span className="flex items-center gap-2 text-lg font-bold tabular-nums">
              {formatMinor(subtotal, currency)}
              <ChevronDown aria-hidden="true" className="size-5" />
            </span>
          </button>
        </div>
      ) : null}

      {selected ? (
        <ItemSheet
          key={selected.id}
          item={selected}
          currency={currency}
          addLabel="Add to the ticket"
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

/**
 * Stable per-item tints for photo-less tiles. Keyed off the name so an item
 * keeps its colour between sessions and across devices — a colour that moved
 * would be worse than no colour at all.
 */
const PLACEHOLDER_TONES = [
  "var(--st-preparing)",
  "var(--st-ready)",
  "var(--st-delivering)",
  "var(--st-served)",
  "var(--brand-700)",
];

function toneIndex(name: string): number {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 997;
  }
  return hash % PLACEHOLDER_TONES.length;
}


function ItemTile({
  item,
  currency,
  onPick,
}: {
  item: MenuItem;
  currency: string;
  onPick: () => void;
}) {
  const src = imageUrl(item.imageUrl, 320);

  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "bg-card ring-foreground/10 group flex flex-col overflow-hidden rounded-xl text-left ring-1 transition-shadow",
        "hover:ring-brand-500 focus-visible:ring-ring hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
      )}
    >
      <span className="bg-surface-2 relative block aspect-[4/3] w-full overflow-hidden">
        {src ? (
          // Cloudinary already sizes and re-formats these; next/image would
          // add a second transform pipeline for no gain.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          // Five identical grey placeholders are no easier to tell apart than
          // five identical labels. A tinted initial at least gives the eye
          // something to aim at until a manager uploads a photo.
          <span
            aria-hidden="true"
            className="grid size-full place-items-center text-3xl font-bold"
            style={{
              background: `color-mix(in oklch, ${PLACEHOLDER_TONES[toneIndex(item.name)]} 14%, white)`,
              color: PLACEHOLDER_TONES[toneIndex(item.name)],
            }}
          >
            {item.name.trim().charAt(0).toUpperCase()}
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col gap-0.5 p-2.5">
        <span className="text-sm leading-tight font-medium">{item.name}</span>
        <span className="text-muted-foreground text-sm tabular-nums">
          {formatMinor(fromPriceMinor(item), currency)}
        </span>
      </span>
    </button>
  );
}
