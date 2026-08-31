import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/api-server";

const UPCOMING = [
  { phase: "Phase 3", title: "Menu management", detail: "Categories, items, variants, modifiers, images." },
  { phase: "Phase 4", title: "Ordering", detail: "The pricing core and the order state machine." },
  { phase: "Phase 5", title: "POS and live queue", detail: "SSE order feed, walk-in entry, status transitions." },
];

export default async function DashboardPage() {
  const user = await getSessionUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user?.name.split(" ")[0]}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Authentication is live. The queue arrives with the order pipeline.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {UPCOMING.map((item) => (
          <Card key={item.phase}>
            <CardHeader>
              <CardDescription>{item.phase}</CardDescription>
              <CardTitle className="text-base">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">{item.detail}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
