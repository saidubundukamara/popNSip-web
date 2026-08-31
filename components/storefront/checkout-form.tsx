"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ApiError } from "@/lib/api-client";
import { lineTotalOf, subtotalOf, unitPriceOf, useCart, useCartHydrated } from "@/lib/cart-store";
import { formatMinor } from "@/lib/format";
import { placeOrder, type OrderType, type PaymentMethod, type PublicSettings } from "@/lib/menu";

/**
 * Checkout (FR-SHOP-4 to FR-SHOP-6, FR-SHOP-10, FR-SHOP-11).
 *
 * The idempotency key is generated once when the form mounts and reused for
 * every submit attempt, so a retry after a dropped connection returns the
 * original order rather than creating a second.
 */
export function CheckoutForm({ settings }: { settings: PublicSettings }) {
  const router = useRouter();
  const lines = useCart((state) => state.lines);
  const tableCode = useCart((state) => state.tableCode);
  const setQuantity = useCart((state) => state.setQuantity);
  const clear = useCart((state) => state.clear);

  const hydrated = useCartHydrated();
  const [type, setType] = useState<OrderType | null>(null);
  const [payment, setPayment] = useState<PaymentMethod>("CASH");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string[]>([]);

  // One key per checkout attempt, held across every retry (FR-SHOP-10). A lazy
  // initialiser rather than a ref: the value must be stable, and it is never
  // rendered, so it cannot cause a hydration mismatch.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const available: { value: OrderType; label: string; enabled: boolean }[] = [
    { value: "DELIVERY", label: "Delivery", enabled: settings.orderTypes.delivery },
    { value: "PICKUP", label: "Pickup", enabled: settings.orderTypes.pickup },
    { value: "DINE_IN", label: "Dine-in", enabled: settings.orderTypes.dineIn },
  ];

  // A table code from the QR link means dine-in, unless the customer says otherwise.
  const effectiveType = type ?? (tableCode ? "DINE_IN" : null);

  if (!hydrated) return <div className="mx-auto max-w-lg px-4 py-16" />;

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-lg font-semibold">Your cart is empty</h1>
        <p className="text-muted-foreground mt-2 text-sm">Add something from the menu to get started.</p>
        <Button asChild className="mt-6">
          <Link href="/">Back to the menu</Link>
        </Button>
      </div>
    );
  }

  const subtotal = subtotalOf(lines);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setDetails([]);

    if (!effectiveType) {
      setError("Choose how you would like to receive your order.");
      return;
    }

    const form = new FormData(event.currentTarget);
    setSubmitting(true);

    try {
      const { order } = await placeOrder(
        {
          type: effectiveType,
          paymentMethod: payment,
          lines: lines.map((line) => ({
            menuItemId: line.menuItemId,
            ...(line.variantId ? { variantId: line.variantId } : {}),
            modifierIds: line.modifiers.map((modifier) => modifier.id),
            quantity: line.quantity,
            ...(line.notes ? { notes: line.notes } : {}),
          })),
          customer: {
            name: String(form.get("name") ?? "").trim(),
            phone: String(form.get("phone") ?? "").trim(),
          },
          ...(effectiveType === "DELIVERY"
            ? {
                deliveryAddress: String(form.get("address") ?? "").trim(),
                deliveryNotes: String(form.get("landmark") ?? "").trim(),
              }
            : {}),
          ...(effectiveType === "DINE_IN" ? { tableCode: String(form.get("tableCode") ?? tableCode ?? "") } : {}),
        },
        idempotencyKey,
      );

      clear();
      router.replace(`/orders/track/${order.trackingToken}`);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        // Name what the customer has to fix, rather than a generic failure.
        const body = caught as ApiError & {
          issues?: { message: string }[];
        };
        setDetails(body.issues?.map((issue) => issue.message) ?? []);
      } else {
        setError("We could not reach the kitchen. Check your connection and try again.");
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8">
      <div>
        <Link href="/" className="text-muted-foreground text-sm hover:underline">
          ← Back to the menu
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Your order</h1>
      </div>

      {!settings.isOpen ? (
        <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {settings.branch.name} is closed right now. You can build your order, but it cannot be sent until we reopen.
        </p>
      ) : null}

      {/* ── the cart ── */}
      <ul className="flex flex-col divide-y">
        {lines.map((line) => (
          <li key={line.key} className="flex items-start gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {line.name}
                {line.variantName ? <span className="text-muted-foreground"> · {line.variantName}</span> : null}
              </p>
              {line.modifiers.length > 0 ? (
                <p className="text-muted-foreground text-xs">
                  {line.modifiers.map((modifier) => modifier.name).join(", ")}
                </p>
              ) : null}
              {line.notes ? <p className="text-muted-foreground text-xs italic">“{line.notes}”</p> : null}
              <p className="text-muted-foreground mt-1 text-xs">
                {formatMinor(unitPriceOf(line), settings.branch.currency)} each
              </p>
            </div>

            <div className="flex items-center gap-1 rounded-md border">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Reduce ${line.name}`}
                onClick={() => setQuantity(line.key, line.quantity - 1)}
              >
                −
              </Button>
              <span className="w-6 text-center text-sm tabular-nums">{line.quantity}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Add another ${line.name}`}
                onClick={() => setQuantity(line.key, line.quantity + 1)}
              >
                +
              </Button>
            </div>

            <span className="w-20 text-right text-sm tabular-nums">
              {formatMinor(lineTotalOf(line), settings.branch.currency)}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between text-sm font-medium">
        <span>Subtotal</span>
        <span className="tabular-nums">{formatMinor(subtotal, settings.branch.currency)}</span>
      </div>
      <p className="text-muted-foreground -mt-4 text-xs">
        Delivery charges, if any, are added by the restaurant when they accept your order.
      </p>

      <Separator />

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        {/* ── order type ── */}
        <fieldset>
          <legend className="text-sm font-medium">How would you like it?</legend>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {available.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={!option.enabled}
                onClick={() => setType(option.value)}
                className={`rounded-md border px-3 py-2 text-sm ${
                  effectiveType === option.value ? "border-foreground font-medium" : "hover:bg-muted/50"
                } ${option.enabled ? "" : "cursor-not-allowed opacity-40"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* ── who ── */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" required autoComplete="name" />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">WhatsApp number</Label>
          <Input id="phone" name="phone" required inputMode="tel" placeholder="076 123456" autoComplete="tel" />
          <p className="text-muted-foreground text-xs">We send order updates here.</p>
        </div>

        {/* ── where ── */}
        {effectiveType === "DELIVERY" ? (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="address">Delivery address</Label>
              <Input id="address" name="address" required autoComplete="street-address" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="landmark">Landmark or directions</Label>
              <Input id="landmark" name="landmark" placeholder="Near the blue gate" />
            </div>
          </>
        ) : null}

        {effectiveType === "DINE_IN" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="tableCode">Table</Label>
            <Input id="tableCode" name="tableCode" defaultValue={tableCode ?? ""} required placeholder="T4" />
          </div>
        ) : null}

        {/* ── payment ── */}
        <fieldset>
          <legend className="text-sm font-medium">Payment</legend>
          <div className="mt-3 flex flex-col gap-2">
            {(
              [
                { value: "CASH", label: "Cash", hint: "Pay when you collect or on delivery." },
                { value: "MOBILE_MONEY", label: "Mobile money", hint: "Orange Money or Africell Money." },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className="hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-sm has-[:checked]:border-foreground"
              >
                <input
                  type="radio"
                  name="payment"
                  className="accent-foreground mt-0.5 size-4"
                  checked={payment === option.value}
                  onChange={() => setPayment(option.value)}
                />
                <span>
                  <span className="block font-medium">{option.label}</span>
                  <span className="text-muted-foreground block text-xs">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {error ? (
          <div role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
            <p>{error}</p>
            {details.length > 0 ? (
              <ul className="mt-1 list-inside list-disc text-xs">
                {details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <Button type="submit" size="lg" disabled={submitting || !settings.isOpen}>
          {submitting
            ? "Sending…"
            : `Place order · ${formatMinor(subtotal, settings.branch.currency)}`}
        </Button>

        <p className="text-muted-foreground text-center text-xs">
          The restaurant confirms the final total when they accept your order.
        </p>
      </form>
    </div>
  );
}
