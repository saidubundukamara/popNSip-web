"use client";

import * as React from "react";
import { Loader2, ShieldOff, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ConfirmAction } from "@/components/dashboard/shared/confirm-action";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { createStaff, fetchStaff, updateStaff, type StaffAccount } from "@/lib/admin";
import type { StaffRole } from "@/lib/api-client";
import { roleLabel } from "@/lib/roles";

const ROLES: { value: StaffRole; label: string; hint: string }[] = [
  { value: "STAFF", label: "Cashier", hint: "Takes orders and moves them through the queue." },
  { value: "MANAGER", label: "Manager", hint: "Also edits the menu, cancels orders and sees reports." },
  { value: "OWNER", label: "Owner", hint: "Everything, including staff accounts." },
];

/**
 * Staff accounts (FR-AUTH-3). Owner only, over an API that has been complete
 * and entirely unreachable from a browser since Phase 1.
 */
export function StaffView({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = React.useState<StaffAccount[] | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const { users: found } = await fetchStaff();
      setUsers(found);
    } catch {
      setUsers([]);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function run(id: string, action: () => Promise<unknown>, failure: string) {
    setBusy(id);
    try {
      await action();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : failure);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <NewStaffSheet onCreated={load} />

      <div className="bg-card ring-foreground/10 overflow-hidden rounded-xl ring-1">
        {users === null ? (
          <div className="space-y-px p-4">
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-16" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No one else has an account yet"
            hint="Add the people who work the counter so they can sign in on their own."
          />
        ) : (
          <ul className="divide-border divide-y">
            {users.map((user) => (
              <li key={user.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="min-w-40 flex-1">
                  <span className="flex items-center gap-2 font-medium">
                    {user.name}
                    {!user.isActive ? (
                      <span className="bg-st-void-bg text-st-void rounded-full px-2 py-0.5 text-xs font-semibold">
                        Signed out for good
                      </span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground block truncate text-sm">{user.email}</span>
                </span>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {ROLES.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      disabled={busy === user.id || user.id === currentUserId}
                      aria-pressed={user.role === role.value}
                      onClick={() =>
                        void run(
                          user.id,
                          () => updateStaff(user.id, { role: role.value }),
                          "Could not change the role.",
                        )
                      }
                      className={cn(
                        "h-9 rounded-full px-3 text-sm font-medium transition-colors disabled:opacity-50",
                        user.role === role.value
                          ? "bg-brand-700 text-white"
                          : "bg-surface-2 text-foreground/75 hover:bg-muted",
                      )}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>

                {user.id === currentUserId ? (
                  <span className="text-muted-foreground shrink-0 text-sm">This is you</span>
                ) : user.isActive ? (
                  <ConfirmAction
                    trigger={
                      <Button size="touch" variant="outline" disabled={busy === user.id}>
                        {busy === user.id ? (
                          <Loader2 className="animate-spin" aria-hidden="true" />
                        ) : (
                          <ShieldOff aria-hidden="true" />
                        )}
                        Stop access
                      </Button>
                    }
                    title={`Stop ${user.name} signing in?`}
                    consequence={
                      <>
                        {user.name} is signed out immediately, on every device, including one they
                        are using right now. Their past orders and the record of who did what stay
                        exactly as they are. You can let them back in later.
                      </>
                    }
                    confirmLabel="Stop access"
                    onConfirm={() =>
                      run(user.id, () => updateStaff(user.id, { isActive: false }), "Could not do that.")
                    }
                  />
                ) : (
                  <Button
                    size="touch"
                    variant="outline"
                    disabled={busy === user.id}
                    onClick={() =>
                      void run(
                        user.id,
                        () => updateStaff(user.id, { isActive: true }),
                        "Could not do that.",
                      )
                    }
                  >
                    Let them back in
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-muted-foreground text-sm">
        Stopping someone&rsquo;s access takes effect on their next tap, not their next sign-in —
        the account is checked on every request.
      </p>
    </div>
  );
}

function NewStaffSheet({ onCreated }: { onCreated: () => Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const [role, setRole] = React.useState<StaffRole>("STAFF");
  const [busy, setBusy] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="touch" className="self-start">
          <UserPlus aria-hidden="true" />
          Add someone
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add someone to the team</SheetTitle>
          <SheetDescription>
            They sign in with this email and password. Tell them to change the password once
            they are in.
          </SheetDescription>
        </SheetHeader>

        <form
          className="flex flex-col gap-4 px-4 pb-8"
          onSubmit={(event) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            const password = String(fields.get("password") ?? "");
            if (password.length < 12) {
              toast.error("The password needs at least 12 characters.");
              return;
            }

            setBusy(true);
            void createStaff({
              email: String(fields.get("email") ?? "").trim(),
              name: String(fields.get("name") ?? "").trim(),
              role,
              password,
            })
              .then(async () => {
                toast.success("Account created.");
                setOpen(false);
                await onCreated();
              })
              .catch((error: unknown) =>
                toast.error(
                  error instanceof Error ? error.message : "Could not create the account.",
                ),
              )
              .finally(() => setBusy(false));
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="staff-name">Their name</Label>
            <Input id="staff-name" name="name" required autoComplete="off" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="staff-email">Email</Label>
            <Input id="staff-email" name="email" type="email" required autoComplete="off" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="staff-password">First password</Label>
            <Input
              id="staff-password"
              name="password"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
            />
            <p className="text-muted-foreground text-xs">At least 12 characters.</p>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">What can they do?</legend>
            {ROLES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRole(option.value)}
                aria-pressed={role === option.value}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-colors",
                  role === option.value
                    ? "border-brand-500 bg-brand-50"
                    : "border-border hover:bg-muted",
                )}
              >
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="text-muted-foreground block text-xs">{option.hint}</span>
              </button>
            ))}
          </fieldset>

          <Button type="submit" size="touch-lg" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Create the account as {roleLabel(role)}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
