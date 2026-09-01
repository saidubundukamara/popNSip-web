"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The counter's "where is that order?" box. Staff type a reference, a name, or
 * the phone number the way it is spoken — "077 900100" — and the server
 * matches it against the stored E.164 form.
 */
export function OrderSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [term, setTerm] = React.useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const query = term.trim();
    if (!query) return;
    router.push(`/dashboard/orders?search=${encodeURIComponent(query)}`);
  }

  return (
    <form onSubmit={submit} role="search" className={cn("relative", className)}>
      <Search
        aria-hidden="true"
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
      />
      <input
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Find an order by number, name or phone"
        aria-label="Find an order"
        className={cn(
          "bg-surface border-border h-11 w-full rounded-xl border pr-3 pl-9 text-sm",
          "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-2 focus-visible:outline-none",
        )}
      />
    </form>
  );
}
