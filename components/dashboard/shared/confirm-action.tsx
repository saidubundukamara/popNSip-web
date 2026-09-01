"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * The gate in front of anything that cannot be undone.
 *
 * Until now the dangerous actions in this app had the *least* friction of
 * anything in it: cancelling a paid order, deleting a modifier group with all
 * its modifiers, and archiving a category were each a single unguarded click,
 * while `alert-dialog` sat installed and unimported.
 *
 * Two rules this component enforces so callers cannot forget them:
 *
 * - `consequence` says what will actually happen, in the words a person at the
 *   counter would use, and names the thing being acted on. "Are you sure?" is
 *   not a consequence.
 * - the confirm button repeats the verb from the trigger. If the button that
 *   opened this said "Cancel order", the one that commits it says the same,
 *   so nobody has to hold a translation in their head.
 */
export function ConfirmAction({
  trigger,
  title,
  consequence,
  confirmLabel,
  onConfirm,
  destructive = true,
}: {
  trigger: React.ReactNode;
  title: string;
  consequence: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function commit(event: React.MouseEvent) {
    // Hold the dialog open while the request is in flight, so the spinner has
    // somewhere to live and a slow connection cannot be mistaken for a
    // no-op and tapped twice.
    event.preventDefault();
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-base">{consequence}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel size="touch" disabled={pending}>
            Go back
          </AlertDialogCancel>
          <AlertDialogAction
            size="touch"
            variant={destructive ? "danger" : "default"}
            onClick={commit}
            disabled={pending}
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
