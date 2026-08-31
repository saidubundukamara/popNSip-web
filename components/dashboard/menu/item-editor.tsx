"use client";

import { Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { formatMinor, imageUrl } from "@/lib/format";
import * as api from "@/lib/menu";
import type { Category, MenuItem } from "@/lib/menu";

/**
 * The item editor: details, photo, variants, and modifier groups in one sheet.
 *
 * Prices are entered in leones and converted to minor units at the boundary
 * here, so nothing below this component handles a decimal.
 */
export function ItemEditor({
  item,
  categories,
  onClose,
  onChanged,
}: {
  item: MenuItem;
  categories: Category[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [current, setCurrent] = useState(item);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const { item: fresh } = await api.fetchItem(current.id);
    setCurrent(fresh);
    await onChanged();
  };

  const run = async (action: () => Promise<unknown>, failure: string) => {
    setBusy(true);
    try {
      await action();
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : failure);
    } finally {
      setBusy(false);
    }
  };

  const hero = imageUrl(current.imageUrl, 600);

  return (
    <Sheet open onOpenChange={(open: boolean) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{current.name}</SheetTitle>
          <SheetDescription>Changes save as you go.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-8 px-4 pb-8">
          {/* ── details ── */}
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const leones = Number(form.get("price"));

              if (!Number.isFinite(leones) || leones < 0) {
                toast.error("Enter a price of zero or more.");
                return;
              }

              void run(
                () =>
                  api.updateItem(current.id, {
                    name: String(form.get("name")).trim(),
                    description: String(form.get("description")).trim() || null,
                    basePriceMinor: Math.round(leones * 100),
                    categoryId: String(form.get("categoryId")),
                  }),
                "Could not save the item.",
              );
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={current.name} required />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={2} defaultValue={current.description ?? ""} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="price">Base price (Le)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={(current.basePriceMinor / 100).toString()}
                />
                {current.variants.length > 0 ? (
                  <p className="text-muted-foreground text-xs">Variants below override this.</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="categoryId">Category</Label>
                <select
                  id="categoryId"
                  name="categoryId"
                  defaultValue={current.categoryId}
                  className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button type="submit" disabled={busy} className="self-start">
              Save details
            </Button>
          </form>

          <Separator />

          {/* ── photo ── */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Photo</h3>

            <div className="flex items-center gap-4">
              {hero ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={hero} alt="" className="bg-muted size-24 rounded-md object-cover" />
              ) : (
                <div className="bg-muted text-muted-foreground flex size-24 items-center justify-center rounded-md text-xs">
                  None
                </div>
              )}

              <div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    void run(() => api.uploadItemImage(current.id, file), "Could not upload the image.");
                  }}
                />
                <Button variant="outline" size="sm" disabled={busy} onClick={() => fileInput.current?.click()}>
                  <Upload className="mr-2 size-4" />
                  {current.imageUrl ? "Replace" : "Upload"}
                </Button>
                <p className="text-muted-foreground mt-2 text-xs">JPEG, PNG, WebP or AVIF. Up to 8MB.</p>
              </div>
            </div>
          </section>

          <Separator />

          {/* ── variants ── */}
          <section className="flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-medium">Variants</h3>
              <p className="text-muted-foreground text-xs">
                If an item has variants, the customer must choose exactly one.
              </p>
            </div>

            {current.variants.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {current.variants.map((variant) => (
                  <li key={variant.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                    <span className="text-sm">{variant.name}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-muted-foreground text-sm">{formatMinor(variant.priceMinor)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={busy}
                        aria-label={`Remove ${variant.name}`}
                        onClick={() => void run(() => api.removeVariant(variant.id), "Could not remove the variant.")}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            <InlineAdd
              busy={busy}
              fields={[
                { name: "name", placeholder: "Name, e.g. Large", type: "text" },
                { name: "price", placeholder: "Le", type: "number" },
              ]}
              onAdd={(values) =>
                run(
                  () =>
                    api.createVariant(current.id, {
                      name: values.name,
                      priceMinor: Math.round(Number(values.price) * 100),
                    }),
                  "Could not add the variant.",
                )
              }
            />
          </section>

          <Separator />

          {/* ── modifier groups ── */}
          <section className="flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-medium">Modifier groups</h3>
              <p className="text-muted-foreground text-xs">
                A group with a minimum of 1 or more is required at checkout.
              </p>
            </div>

            {current.modifierGroups.map((group) => (
              <div key={group.id} className="flex flex-col gap-2 rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{group.name}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs">
                      choose {group.minSelect}–{group.maxSelect}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busy}
                      aria-label={`Remove ${group.name}`}
                      onClick={() =>
                        void run(() => api.deleteModifierGroup(group.id), "Could not remove the group.")
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </span>
                </div>

                <ul className="flex flex-col gap-1">
                  {group.modifiers.map((modifier) => (
                    <li key={modifier.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{modifier.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">{formatMinor(modifier.priceMinor)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          disabled={busy}
                          aria-label={`Remove ${modifier.name}`}
                          onClick={() =>
                            void run(() => api.removeModifier(modifier.id), "Could not remove the modifier.")
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>

                <InlineAdd
                  busy={busy}
                  fields={[
                    { name: "name", placeholder: "Modifier", type: "text" },
                    { name: "price", placeholder: "Le", type: "number" },
                  ]}
                  onAdd={(values) =>
                    run(
                      () =>
                        api.createModifier(group.id, {
                          name: values.name,
                          priceMinor: Math.round(Number(values.price || 0) * 100),
                        }),
                      "Could not add the modifier.",
                    )
                  }
                />
              </div>
            ))}

            <InlineAdd
              busy={busy}
              submitLabel="Add group"
              fields={[
                { name: "name", placeholder: "Group name", type: "text" },
                { name: "minSelect", placeholder: "Min", type: "number" },
                { name: "maxSelect", placeholder: "Max", type: "number" },
              ]}
              onAdd={(values) =>
                run(
                  () =>
                    api.createModifierGroup(current.id, {
                      name: values.name,
                      minSelect: Number(values.minSelect || 0),
                      maxSelect: Number(values.maxSelect || 1),
                    }),
                  "Could not add the group.",
                )
              }
            />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** A one-line add form. Used for variants, modifiers, and groups. */
function InlineAdd({
  fields,
  onAdd,
  busy,
  submitLabel = "Add",
}: {
  fields: { name: string; placeholder: string; type: string }[];
  onAdd: (values: Record<string, string>) => Promise<void>;
  busy: boolean;
  submitLabel?: string;
}) {
  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const values = Object.fromEntries(fields.map((field) => [field.name, String(data.get(field.name) ?? "")]));
        if (!values.name?.trim()) return;
        form.reset();
        void onAdd(values);
      }}
    >
      {fields.map((field) => (
        <Input
          key={field.name}
          name={field.name}
          type={field.type}
          step={field.type === "number" ? "0.01" : undefined}
          min={field.type === "number" ? "0" : undefined}
          placeholder={field.placeholder}
          aria-label={field.placeholder}
          className={field.type === "number" ? "w-28" : undefined}
        />
      ))}
      <Button type="submit" variant="outline" size="sm" disabled={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}
