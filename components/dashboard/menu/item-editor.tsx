"use client";

import { ImageOff, Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmAction } from "@/components/dashboard/shared/confirm-action";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Money } from "@/components/dashboard/shared/money";
import { imageUrl } from "@/lib/format";
import * as api from "@/lib/menu";
import type { Category, MenuItem } from "@/lib/menu";

/**
 * The item editor.
 *
 * Details, photo, sizes and choices were four stacked sections in one long
 * scroll, which put every decision about an item on screen at once. They are
 * tabs now: one thing at a time, and the tab you want is named rather than
 * hunted for.
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
  const [categoryId, setCategoryId] = useState(item.categoryId);
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
          <SheetDescription>
            Sizes and choices save the moment you add them. Details need the
            Save button.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="details" className="px-4 pb-8">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="photo">Photo</TabsTrigger>
            <TabsTrigger value="sizes">
              Sizes ({current.variants.length})
            </TabsTrigger>
            <TabsTrigger value="choices">
              Choices ({current.modifierGroups.length})
            </TabsTrigger>
          </TabsList>

          {/* ── details ── */}
          <TabsContent value="details" className="pt-4">
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
                      description:
                        String(form.get("description")).trim() || null,
                      basePriceMinor: Math.round(leones * 100),
                      categoryId,
                    }),
                  "Could not save the item.",
                );
              }}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={current.name}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={2}
                  defaultValue={current.description ?? ""}
                />
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
                    <p className="text-muted-foreground text-xs">
                      Variants below override this.
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="categoryId">Category</Label>
                  {/* The shadcn Select has been in this repo, unimported, since
                    Phase 3; a bare <select> beside it is two form vocabularies
                    on one screen. */}
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger id="categoryId" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                size="touch"
                disabled={busy}
                className="self-start"
              >
                {busy ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : null}
                Save details
              </Button>
            </form>
          </TabsContent>

          {/* ── photo ── */}
          <TabsContent value="photo" className="pt-4">
            <section className="flex flex-col gap-3">
              <p className="text-muted-foreground text-sm">
                A photograph is how a cashier finds this on the POS without
                reading. It is worth taking one.
              </p>

              <div className="flex items-center gap-4">
                {hero ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={hero}
                    alt=""
                    className="bg-muted size-24 rounded-lg object-cover"
                  />
                ) : (
                  <div className="bg-muted text-muted-foreground flex size-24 items-center justify-center rounded-lg">
                    <ImageOff className="size-6" aria-hidden="true" />
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
                      void run(
                        () => api.uploadItemImage(current.id, file),
                        "Could not upload the image.",
                      );
                    }}
                  />
                  <Button
                    variant="outline"
                    size="touch"
                    disabled={busy}
                    onClick={() => fileInput.current?.click()}
                  >
                    {busy ? (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Upload aria-hidden="true" />
                    )}
                    {current.imageUrl ? "Change the photo" : "Add a photo"}
                  </Button>
                  <p className="text-muted-foreground mt-2 text-xs">
                    JPEG, PNG, WebP or AVIF. Up to 8MB.
                  </p>
                </div>
              </div>
            </section>
          </TabsContent>

          {/* ── variants ── */}
          <TabsContent value="sizes" className="flex flex-col gap-3 pt-4">
            <p className="text-muted-foreground text-sm">
              Sizes the customer picks between, like Regular and Large. If there
              are any, they must choose one, and the size price replaces the
              base price.
            </p>

            {current.variants.length === 0 ? (
              <EmptyState
                size="sm"
                title="No sizes"
                hint="Everyone pays the base price."
              />
            ) : null}

            {current.variants.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {current.variants.map((variant) => (
                  <li
                    key={variant.id}
                    className="border-border flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                  >
                    <span className="text-sm font-medium">{variant.name}</span>
                    <span className="flex items-center gap-3">
                      <Money
                        minor={variant.priceMinor}
                        className="text-muted-foreground text-sm"
                      />
                      <ConfirmAction
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-touch"
                            disabled={busy}
                            aria-label={`Remove the ${variant.name} size`}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        }
                        title={`Remove the ${variant.name} size?`}
                        consequence={`Customers will no longer be able to order ${current.name} in ${variant.name}. Orders already placed keep it.`}
                        confirmLabel="Remove it"
                        onConfirm={() =>
                          run(
                            () => api.removeVariant(variant.id),
                            "Could not remove the size.",
                          )
                        }
                      />
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            <InlineAdd
              busy={busy}
              fields={[
                {
                  name: "name",
                  placeholder: "Size name, e.g. Large",
                  type: "text",
                },
                { name: "price", placeholder: "Le", type: "number" },
              ]}
              onAdd={(values) =>
                run(
                  () =>
                    api.createVariant(current.id, {
                      name: values.name,
                      priceMinor: Math.round(Number(values.price) * 100),
                    }),
                  "Could not add the size.",
                )
              }
            />
          </TabsContent>

          {/* ── modifier groups ── */}
          <TabsContent value="choices" className="flex flex-col gap-4 pt-4">
            <p className="text-muted-foreground text-sm">
              Questions the customer answers, like &ldquo;choose your
              protein&rdquo;. Set the minimum to 1 or more to make a question
              compulsory.
            </p>

            {current.modifierGroups.length === 0 ? (
              <EmptyState
                size="sm"
                title="No questions"
                hint="The customer just adds the item."
              />
            ) : null}

            {current.modifierGroups.map((group) => (
              <div
                key={group.id}
                className="flex flex-col gap-2 rounded-md border p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{group.name}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs">
                      choose {group.minSelect}–{group.maxSelect}
                    </span>
                    <ConfirmAction
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-touch"
                          disabled={busy}
                          aria-label={`Remove the ${group.name} question`}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      }
                      title={`Remove "${group.name}"?`}
                      consequence={
                        group.modifiers.length > 0 ? (
                          <>
                            All {group.modifiers.length} of its choices go with
                            it —{" "}
                            {group.modifiers
                              .map((modifier) => modifier.name)
                              .join(", ")}
                            . Orders already placed keep what was chosen.
                          </>
                        ) : (
                          "Customers will no longer be asked this."
                        )
                      }
                      confirmLabel="Remove it"
                      onConfirm={() =>
                        run(
                          () => api.deleteModifierGroup(group.id),
                          "Could not remove the question.",
                        )
                      }
                    />
                  </span>
                </div>

                <ul className="flex flex-col gap-1">
                  {group.modifiers.map((modifier) => (
                    <li
                      key={modifier.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {modifier.name}
                      </span>
                      <span className="flex items-center gap-2">
                        <Money
                          minor={modifier.priceMinor}
                          className="text-muted-foreground text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="density-compact size-8"
                          disabled={busy}
                          aria-label={`Remove ${modifier.name}`}
                          onClick={() =>
                            void run(
                              () => api.removeModifier(modifier.id),
                              "Could not remove the choice.",
                            )
                          }
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>

                <InlineAdd
                  busy={busy}
                  fields={[
                    {
                      name: "name",
                      placeholder: "Choice, e.g. Beef",
                      type: "text",
                    },
                    { name: "price", placeholder: "Le", type: "number" },
                  ]}
                  onAdd={(values) =>
                    run(
                      () =>
                        api.createModifier(group.id, {
                          name: values.name,
                          priceMinor: Math.round(
                            Number(values.price || 0) * 100,
                          ),
                        }),
                      "Could not add the choice.",
                    )
                  }
                />
              </div>
            ))}

            <InlineAdd
              busy={busy}
              submitLabel="Add question"
              fields={[
                {
                  name: "name",
                  placeholder: "Question, e.g. Choose your protein",
                  type: "text",
                },
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
                  "Could not add the question.",
                )
              }
            />
          </TabsContent>
        </Tabs>
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
        const values = Object.fromEntries(
          fields.map((field) => [
            field.name,
            String(data.get(field.name) ?? ""),
          ]),
        );
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
      <Button type="submit" variant="outline" size="touch" disabled={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}
