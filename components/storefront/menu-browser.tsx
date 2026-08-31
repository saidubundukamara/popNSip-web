"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CartBar } from "@/components/storefront/cart-bar";
import { ItemSheet } from "@/components/storefront/item-sheet";
import { useCart } from "@/lib/cart-store";
import { formatMinor, imageUrl } from "@/lib/format";
import { fromPriceMinor, type MenuItem, type PublicMenu } from "@/lib/menu";

/**
 * The storefront menu (FR-SHOP-1). Built for a 360px screen first: one column
 * of items, a horizontally scrolling category rail, and thumbnails small
 * enough to arrive on mobile data.
 */
export function MenuBrowser({ menu }: { menu: PublicMenu }) {
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const categories = menu.categories.filter((category) => category.items.length > 0);

  // FR-SHOP-9: a QR link of the form /?table=T4 binds the session to a table.
  // Stored in the cart so it survives the walk through the menu to checkout.
  const searchParams = useSearchParams();
  const tableParam = searchParams.get("table");
  const setTableCode = useCart((state) => state.setTableCode);

  useEffect(() => {
    if (tableParam) setTableCode(tableParam.trim().toUpperCase());
  }, [tableParam, setTableCode]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-background/95 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-4">
          <h1 className="text-lg font-semibold tracking-tight">{menu.branch.name}</h1>
          <p className="text-muted-foreground text-xs">Delivery · Pickup · Dine-in</p>
        </div>

        {categories.length > 1 ? (
          <nav aria-label="Menu sections" className="mx-auto w-full max-w-3xl overflow-x-auto px-4 pb-3">
            <ul className="flex gap-2">
              {categories.map((category) => (
                <li key={category.id}>
                  <a
                    href={`#category-${category.id}`}
                    className="bg-muted hover:bg-muted/70 inline-block whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium"
                  >
                    {category.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16">
        {categories.length === 0 ? (
          <p className="text-muted-foreground py-16 text-center text-sm">
            Nothing is on the menu right now. Please check back shortly.
          </p>
        ) : null}

        {categories.map((category) => (
          <section key={category.id} id={`category-${category.id}`} className="scroll-mt-32 pt-8">
            <h2 className="text-base font-semibold tracking-tight">{category.name}</h2>
            {category.description ? (
              <p className="text-muted-foreground mt-1 text-sm">{category.description}</p>
            ) : null}

            <ul className="mt-4 flex flex-col divide-y">
              {category.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    className="hover:bg-muted/50 focus-visible:ring-ring flex w-full items-start gap-4 rounded-md py-4 text-left focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{item.name}</span>
                      {item.description ? (
                        <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-xs">
                          {item.description}
                        </span>
                      ) : null}
                      <span className="mt-1.5 block text-sm">
                        {item.variants.length > 0 ? "From " : null}
                        {formatMinor(fromPriceMinor(item), menu.branch.currency)}
                      </span>
                    </span>

                    <Thumbnail url={item.imageUrl} alt="" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      <CartBar currency={menu.branch.currency} />

      {selected ? (
        <ItemSheet
          key={selected.id}
          item={selected}
          currency={menu.branch.currency}
          onOpenChange={(open: boolean) => {
            if (!open) setSelected(null);
          }}
        />
      ) : null}
    </div>
  );
}

/** FR-MENU-6: an item without a photo gets a neutral tile, never a broken image. */
function Thumbnail({ url, alt }: { url: string | null; alt: string }) {
  const src = imageUrl(url, 200);

  if (!src) {
    return <span aria-hidden className="bg-muted size-20 shrink-0 rounded-md" />;
  }

  // Cloudinary already serves a sized, format-negotiated asset (w_/f_auto/
  // q_auto), so next/image would only proxy an optimised image a second time.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" className="bg-muted size-20 shrink-0 rounded-md object-cover" />
  );
}
