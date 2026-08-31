"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { logout } from "@/lib/api-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleSignOut = () => {
    void logout()
      .catch(() => {
        // The session may already be gone; either way the destination is /login.
      })
      .finally(() => {
        startTransition(() => {
          router.replace("/login");
          router.refresh();
        });
      });
  };

  return (
    <Button variant="outline" size="sm" onClick={handleSignOut} disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
