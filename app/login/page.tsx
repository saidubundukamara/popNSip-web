import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/dashboard/login-form";
import { getSessionUser } from "@/lib/api-server";

export const metadata = {
  title: "Sign in",
};

export default async function LoginPage() {
  // Already signed in: skip the form rather than letting them submit into a
  // session they already have.
  if (await getSessionUser()) redirect("/dashboard");

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">popNsip</h1>
          <p className="text-muted-foreground mt-1 text-sm">Sign in to the staff dashboard</p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
