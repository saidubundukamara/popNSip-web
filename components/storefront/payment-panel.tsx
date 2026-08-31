"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { formatMinor } from "@/lib/format";
import { fetchPaymentState, startPayment, type PaymentState } from "@/lib/menu";

/**
 * Mobile-money payment on the tracking page.
 *
 * FR-PAY-4: nothing here decides that a payment succeeded. It asks the server,
 * and the server only knows what a verified webhook or a server-side status
 * check told it. Dialling the code and coming back proves nothing.
 */
export function PaymentPanel({
  token,
  currency,
  initial,
}: {
  token: string;
  currency: string;
  initial: PaymentState | null;
}) {
  const [state, setState] = useState<PaymentState | null>(initial);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      setState(await fetchPaymentState(token));
    } catch {
      // The next tick tries again; a toast per failed poll would bury the page.
    }
  }, [token]);

  const awaiting = state?.isPaid === false;

  useEffect(() => {
    if (!awaiting) return;
    const timer = setInterval(() => void poll(), 5_000);
    return () => clearInterval(timer);
  }, [awaiting, poll]);

  if (!state || state.isPaid) return null;

  const ussd = state.pending?.ussdCode ?? null;

  return (
    <section className="flex flex-col gap-3 rounded-lg border p-4">
      <div>
        <h2 className="text-sm font-medium">Pay by mobile money</h2>
        <p className="text-muted-foreground text-xs">
          {formatMinor(state.balanceDueMinor, currency)} outstanding
        </p>
      </div>

      {ussd ? (
        <>
          <p className="text-muted-foreground text-sm">
            Dial this on the phone you are paying from:
          </p>
          <p className="bg-muted rounded-md px-3 py-3 text-center font-mono text-lg font-semibold tracking-wide select-all">
            {ussd}
          </p>
          <p role="status" className="text-muted-foreground text-xs">
            Waiting for your payment — this page updates on its own once it clears. It can take a
            minute.
          </p>
        </>
      ) : (
        <>
          <Button
            disabled={starting}
            onClick={() => {
              setStarting(true);
              setError(null);
              void startPayment(token)
                .then(poll)
                .catch((caught: unknown) => {
                  setError(
                    caught instanceof ApiError
                      ? caught.message
                      : "We could not start the payment. Try again in a moment.",
                  );
                })
                .finally(() => setStarting(false));
            }}
          >
            {starting ? "Getting your code…" : "Get a payment code"}
          </Button>
          {error ? (
            <p role="alert" className="text-destructive text-xs">
              {error}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
