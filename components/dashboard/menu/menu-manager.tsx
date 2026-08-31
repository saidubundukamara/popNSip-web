"use client";

import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { ItemEditor } from "@/components/dashboard/menu/item-editor";
import { SortableList } from "@/components/dashboard/menu/sortable-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatMinor } from "@/lib/format";
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
 */
export function MenuManager({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [selectedId, setSelectedId] = useState<string | null>(initialCategories[0]?.id ?? null);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [newItem, setNewItem] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { categories: loaded } = await api.fetchManagedMenu();
      setCategories(loaded);
      setSelectedId((current) => current ?? loaded[0]?.id ?? null);
    } catch {
      toast.error("Could not load the menu.");
    }
  }, []);

  const run = async (action: () => Promise<unknown>, failure: string) => {
    setBusy(true);
    try {
      await action();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : failure);
    } finally {
      setBusy(false);
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
              void run(() => api.reorderCategories(ids), "Could not save the new order.");
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
              void run(() => api.createCategory({ name }), "Could not create the category.");
            }}
          >
            <Input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="New category"
              aria-label="New category name"
            />
            <Button type="submit" size="icon" variant="outline" disabled={busy} aria-label="Add category">
              <Plus className="size-4" />
            </Button>
          </form>
        </section>

        <section aria-labelledby="items-heading" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="items-heading" className="text-sm font-medium">
              {selected ? selected.name : "Items"}
            </h2>
            {selected ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() =>
                  void run(() => api.archiveCategory(selected.id), "Could not archive the category.").then(() =>
                    setSelectedId(null),
                  )
                }
              >
                Archive category
              </Button>
            ) : null}
          </div>

          {!selected ? (
            <p className="text-muted-foreground text-sm">Select a category, or create one to begin.</p>
          ) : (
            <>
              {selected.items.length === 0 ? (
                <p className="text-muted-foreground text-sm">No items in this category yet.</p>
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
                    void run(() => api.reorderItems(selected.id, ids), "Could not save the new order.");
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
                        <span className="text-muted-foreground block text-xs">
                          {formatMinor(item.basePriceMinor)}
                          {item.imageUrl ? null : " · no photo"}
                        </span>
                      </button>

                      <label className="flex shrink-0 items-center gap-2 text-xs">
                        <span className="text-muted-foreground">
                          {item.isAvailable ? "Available" : "Sold out"}
                        </span>
                        <Switch
                          checked={item.isAvailable}
                          disabled={busy}
                          aria-label={`${item.name} available`}
                          onCheckedChange={(checked) =>
                            void run(
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
                <Button type="submit" size="icon" variant="outline" disabled={busy} aria-label="Add item">
                  <Plus className="size-4" />
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
