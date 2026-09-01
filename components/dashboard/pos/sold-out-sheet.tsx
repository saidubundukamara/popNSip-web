"use client";

import * as React from "react";
import { Loader2, PackageX } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { fetchAvailability, setItemAvailability, type AvailabilityCategory } from "@/lib/menu";

/**
 * "We've run out of jollof."
 *
 * The rest of the menu API is manager-and-above, which is right — prices and
 * archiving are not a cashier's job. But running out of something is
 * discovered at the counter, by the person taking the order, and it has to
 * come off the storefront that minute (FR-MENU-5). Routing that through a
 * manager means it stays on sale until somebody senior is free.
 *
 * So this reads a deliberately thin board — name and a switch, no prices, no
 * archived rows — and writes through the one menu route open to staff. It
 * cannot be reached from the POS grid itself, because the public menu hides
 * unavailable items: an item marked sold out would vanish before it could be
 * put back.
 */
export function SoldOutSheet({ onChanged }: { onChanged: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [categories, setCategories] = React.useState<AvailabilityCategory[] | null>(null);
  const [pending, setPending] = React.useState<string | null>(null);
  const [term, setTerm] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      const { categories: found } = await fetchAvailability();
      setCategories(found);
    } catch {
      setCategories([]);
      toast.error("Could not load the menu.");
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [open, load]);

  async function toggle(id: string, isAvailable: boolean) {
    setPending(id);
    // Move the switch now; the counter should not wait on a round trip to see
    // that its tap registered.
    setCategories((current) =>
      current?.map((category) => ({
        ...category,
        items: category.items.map((item) => (item.id === id ? { ...item, isAvailable } : item)),
      })) ?? current,
    );
    try {
      await setItemAvailability(id, isAvailable);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change that.");
      void load();
    } finally {
      setPending(null);
    }
  }

  const query = term.trim().toLowerCase();
  const visible = (categories ?? [])
    .map((category) => ({
      ...category,
      items: query
        ? category.items.filter((item) => item.name.toLowerCase().includes(query))
        : category.items,
    }))
    .filter((category) => category.items.length > 0);

  const soldOut = (categories ?? []).flatMap((c) => c.items).filter((i) => !i.isAvailable).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="touch" variant="outline">
          <PackageX aria-hidden="true" />
          Sold out
          {soldOut > 0 ? (
            <span className="bg-st-unpaid-bg text-st-unpaid rounded-full px-2 text-sm font-semibold tabular-nums">
              {soldOut}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>What have you run out of?</SheetTitle>
          <SheetDescription>
            Turning something off takes it off the shop, WhatsApp and this screen straight away.
            Turn it back on when it is back.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4">
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search"
            aria-label="Search the menu"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {categories === null ? (
            <div className="space-y-2 pt-4">
              {[0, 1, 2, 3, 4].map((row) => (
                <Skeleton key={row} className="h-12" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              size="sm"
              icon={PackageX}
              title={query ? `Nothing matches “${term}”` : "Nothing on the menu"}
            />
          ) : (
            visible.map((category) => (
              <div key={category.id} className="pt-4">
                <p className="text-muted-foreground pb-1 text-xs font-semibold tracking-wider uppercase">
                  {category.name}
                </p>
                <ul className="divide-border divide-y">
                  {category.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.name}</span>
                        <span
                          className={cn(
                            "block text-sm font-medium",
                            item.isAvailable ? "text-muted-foreground" : "text-st-unpaid",
                          )}
                        >
                          {item.isAvailable ? "On sale" : "Sold out"}
                        </span>
                      </span>
                      {pending === item.id ? (
                        <Loader2
                          className="text-muted-foreground size-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : null}
                      <Switch
                        checked={item.isAvailable}
                        disabled={pending === item.id}
                        aria-label={`${item.name} on sale`}
                        onCheckedChange={(checked) => void toggle(item.id, checked)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
