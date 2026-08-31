import { MenuManager } from "@/components/dashboard/menu/menu-manager";
import { getManagedMenu } from "@/lib/api-server";

export const metadata = { title: "Menu" };

export default async function MenuPage() {
  // Fetched here rather than in the client: the page arrives populated, and
  // the manager reloads through the same endpoint after each mutation.
  const categories = await getManagedMenu();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Menu</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Drag to reorder. Changes reach the storefront on its next load.
        </p>
      </div>

      <MenuManager initialCategories={categories} />
    </div>
  );
}
