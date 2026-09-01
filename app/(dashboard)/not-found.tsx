import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/shared/empty-state";

/**
 * Inside the shell, so a wrong address still leaves the nav on screen. Next's
 * bare 404 renders outside every layout, which strands somebody with no way
 * back — the worst possible outcome for a person who is not sure how they got
 * here in the first place.
 */
export default function DashboardNotFound() {
  return (
    <div className="bg-card ring-foreground/10 rounded-xl ring-1">
      <EmptyState
        icon={Compass}
        title="There is nothing at this address"
        hint="The page may have moved, or the link may be out of date. The menu on the left still works."
        action={
          <Button size="touch" asChild>
            <Link href="/dashboard/queue">Go to the queue</Link>
          </Button>
        }
      />
    </div>
  );
}
