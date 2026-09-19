import { CheckoutForm } from "@/components/storefront/checkout-form";
import { API_ORIGIN } from "@/lib/api-origin";
import type { PublicSettings } from "@/lib/menu";

export const metadata = { title: "Checkout" };

async function loadSettings(): Promise<PublicSettings | null> {
  try {
    const response = await fetch(`${API_ORIGIN}/api/settings/public`, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as PublicSettings;
  } catch {
    return null;
  }
}

export default async function CheckoutPage() {
  const settings = await loadSettings();

  if (!settings) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-lg font-semibold">Checkout is unavailable</h1>
        <p className="text-muted-foreground mt-2 text-sm">Please try again in a moment.</p>
      </div>
    );
  }

  return <CheckoutForm settings={settings} />;
}
