import { MenuBrowser } from "@/components/storefront/menu-browser";
import { API_BASE_URL } from "@/lib/api-client";
import type { PublicMenu } from "@/lib/menu";

async function loadMenu(): Promise<PublicMenu | null> {
  try {
    // No Next-side cache. FR-MENU-5 says a sold-out item leaves the storefront
    // immediately, and a manager who edits the menu expects to see it on the
    // next refresh — an ISR window would hold both back. Caching still happens,
    // just at the layer that can be revalidated: the endpoint sets its own
    // Cache-Control for the browser and any CDN in front of it.
    const response = await fetch(`${API_BASE_URL}/api/menu`, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as PublicMenu;
  } catch {
    return null;
  }
}

export default async function StorefrontPage() {
  const menu = await loadMenu();

  if (!menu) {
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-lg font-semibold">The menu is unavailable</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          We could not reach the kitchen just now. Please try again in a moment.
        </p>
      </div>
    );
  }

  return <MenuBrowser menu={menu} />;
}
