"use client";

import { Archive, ImageOff, Loader2, Plus, UtensilsCrossed } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { ItemEditor } from "@/components/dashboard/menu/item-editor";
import { SortableList } from "@/components/dashboard/menu/sortable-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfirmAction } from "@/components/dashboard/shared/confirm-action";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Money } from "@/components/dashboard/shared/money";
import * as api from "@/lib/menu";
import type { Category, MenuItem } from "@/lib/menu";

/**
 * The menu manager. State is held here and passed down: the two lists have to
 * agree about which category is selected, and a reorder in one must not
 * refetch the other.
 *
 * Every mutation writes through the API and then reloads, rather than patching
 * local state optimistically — sortOrder is assigned server-side, so guessing
 * at it locally is how the two get out of step.
 *
 * Pending state is per control. A single page-wide `busy` flag meant one
 * sold-out toggle greyed out every other control on the screen, so marking
 * three things unavailable during a rush was three round trips taken strictly
 * one at a time, each of them looking like the page had frozen.
 */
export function MenuManager({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [selectedId, setSelectedId] = useState<string | null>(initialCategories[0]?.id ?? null);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [newItem, setNewItem] = useState("");
  const [pending, setPending] = useState<Set<string>>(new Set());

  const isPending = (key: string) => pending.has(key);

  const load = useCallback(async () => {
    try {
      const { categories: loaded } = await api.fetchManagedMenu();
      setCategories(loaded);
      setSelectedId((current) => current ?? loaded[0]?.id ?? null);
    } catch {
      toast.error("Could not load the menu.");
    }
  }, []);

  const run = async (key: string, action: () => Promise<unknown>, failure: string) => {
    setPending((current) => new Set(current).add(key));
    try {
      await action();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : failure);
    } finally {
      setPending((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  };

  const selected = categories.find((category) => category.id === selectedId) ?? null;

  return (
    <>
      <div className="grid items-start gap-6 lg:grid-cols-[320px_1fr]">
        <section aria-labelledby="categories-heading" className="flex flex-col gap-3">
          <h2 id="categories-heading" className="text-sm font-medium">
            Categories
          </h2>

          <SortableList
            items={categories}
            onReorder={(ids) => {
              // Reflect the drag immediately; the reload confirms it.
              setCategories((current) =>
                ids.map((id) => current.find((c) => c.id === id)).filter((c) => c !== undefined),
              );
              void run("categories", () => api.reorderCategories(ids), "Could not save the new order.");
            }}
            renderItem={(category) => (
              <button
                type="button"
                onClick={() => setSelectedId(category.id)}
                className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm ${
                  category.id === selectedId ? "bg-muted font-medium" : "hover:bg-muted/50"
                }`}
              >
                <span className="truncate">{category.name}</span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {category.items.length}
                </span>
              </button>
            )}
          />

          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const name = newCategory.trim();
              if (!name) return;
              setNewCategory("");
              void run("new-category", () => api.createCategory({ name }), "Could not create the category.");
            }}
          >
            <Input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="New category"
              aria-label="New category name"
            />
            <Button
              type="submit"
              size="icon-touch"
              variant="outline"
              disabled={isPending("new-category")}
              aria-label="Add category"
            >
              {isPending("new-category") ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Plus aria-hidden="true" />
              )}
            </Button>
          </form>
        </section>

        <section aria-labelledby="items-heading" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="items-heading" className="text-sm font-medium">
              {selected ? selected.name : "Items"}
            </h2>
            {selected ? (
              <ConfirmAction
                trigger={
                  <Button variant="outline" size="touch" disabled={isPending("archive")}>
                    <Archive aria-hidden="true" />
                    Hide this category
                  </Button>
                }
                title={`Hide "${selected.name}"?`}
                consequence={
                  <>
                    {selected.name} and its {selected.items.length}{" "}
                    {selected.items.length === 1 ? "item" : "items"} come off the menu customers
                    see, straight away. Past orders keep showing what was actually bought. You
                    cannot bring it back from this screen.
                  </>
                }
                confirmLabel="Hide this category"
                onConfirm={async () => {
                  await run(
                    "archive",
                    () => api.archiveCategory(selected.id),
                    "Could not hide the category.",
                  );
                  setSelectedId(null);
                }}
              />
            ) : null}
          </div>

          {!selected ? (
            <div className="border-border rounded-xl border border-dashed">
              <EmptyState
                icon={UtensilsCrossed}
                title="Pick a category on the left"
                hint="Or type a name below it to start a new one — starters, drinks, whatever the kitchen calls them."
              />
            </div>
          ) : (
            <>
              {selected.items.length === 0 ? (
                <div className="border-border rounded-xl border border-dashed">
                  <EmptyState
                    size="sm"
                    icon={UtensilsCrossed}
                    title={`Nothing in ${selected.name} yet`}
                    hint="Type a dish name below and add it, then open it to set the price and add a photo."
                  />
                </div>
              ) : (
                <SortableList
                  items={selected.items}
                  onReorder={(ids) => {
                    setCategories((current) =>
                      current.map((category) =>
                        category.id === selected.id
                          ? {
                              ...category,
                              items: ids
                                .map((id) => category.items.find((i) => i.id === id))
                                .filter((i) => i !== undefined),
                            }
                          : category,
                      ),
                    );
                    void run("items", () => api.reorderItems(selected.id, ids), "Could not save the new order.");
                  }}
                  renderItem={(item) => (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setEditing(item)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{item.name}</span>
                          {item.variants.length > 0 ? (
                            <Badge variant="secondary" className="text-[10px]">
                              {item.variants.length} {item.variants.length === 1 ? "size" : "sizes"}
                            </Badge>
                          ) : null}
                          {item.modifierGroups.length > 0 ? (
                            <Badge variant="secondary" className="text-[10px]">
                              {item.modifierGroups.length} {item.modifierGroups.length === 1 ? "group" : "groups"}
                            </Badge>
                          ) : null}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-2 text-sm">
                          <Money minor={item.basePriceMinor} />
                          {item.imageUrl ? null : (
                            <span className="flex items-center gap-1">
                              <ImageOff className="size-3.5" aria-hidden="true" />
                              no photo
                            </span>
                          )}
                        </span>
                      </button>

                      <label className="flex shrink-0 items-center gap-2 text-sm">
                        <span
                          className={cn(
                            "font-medium",
                            item.isAvailable ? "text-muted-foreground" : "text-st-unpaid",
                          )}
                        >
                          {item.isAvailable ? "On sale" : "Sold out"}
                        </span>
                        <Switch
                          checked={item.isAvailable}
                          disabled={isPending(`avail-${item.id}`)}
                          aria-label={`${item.name} on sale`}
                          onCheckedChange={(checked) =>
                            void run(
                              `avail-${item.id}`,
                              () => api.setItemAvailability(item.id, checked),
                              "Could not change availability.",
                            )
                          }
                        />
                      </label>
                    </div>
                  )}
                />
              )}

              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const name = newItem.trim();
                  if (!name) return;
                  setNewItem("");
                  void run(
                    "new-item",
                    () => api.createItem({ categoryId: selected.id, name, basePriceMinor: 0 }),
                    "Could not create the item.",
                  );
                }}
              >
                <Input
                  value={newItem}
                  onChange={(event) => setNewItem(event.target.value)}
                  placeholder="New item"
                  aria-label="New item name"
                />
                <Button
                  type="submit"
                  size="icon-touch"
                  variant="outline"
                  disabled={isPending("new-item")}
                  aria-label="Add item"
                >
                  {isPending("new-item") ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Plus aria-hidden="true" />
                  )}
                </Button>
              </form>
            </>
          )}
        </section>
      </div>

      {editing ? (
        <ItemEditor
          key={editing.id}
          item={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onChanged={load}
        />
      ) : null}
    </>
  );
}
