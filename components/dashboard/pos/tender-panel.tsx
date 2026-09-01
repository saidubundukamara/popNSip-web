"use client";

import * as React from "react";
import { Banknote, Check, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/dashboard/shared/money";
import { formatMinor } from "@/lib/format";
import { recordCash, requestMobileMoney, type StaffOrder } from "@/lib/menu";

/**
 * Taking the money, on the screen where the order was rung up (FR-POS-7).
 *
 * Before this, a cashier who had just built an order was sent to the queue,
 * had to find the card again, open a sheet, and only then could take cash —
 * for a customer standing in front of them holding a note. The change due was
 * a line of body text.
 *
 * Here the change is the largest thing on the screen, because it is the only
 * number the cashier has to act on and they are counting coins while reading
 * it.
 */

/**
 * What a customer plausibly hands over for this particular bill.
 *
 * A fixed list of note values is wrong the moment prices move: Le 500 and
 * Le 1,000 are silly chips against a Le 60 lunch and useless ones against a
 * Le 240,000 party order. So the rounding steps are walked relative to the
 * amount, and anything more than five times the bill is dropped — nobody pays
 * for a drink with a month's rent.
 */
const STEPS_MAJOR = [10, 20, 50, 100, 200, 500, 1_000, 2_000, 5_000, 10_000, 20_000, 50_000];

function tenderSuggestions(dueMinor: number): number[] {
  const rounded = new Set<number>();
  for (const step of STEPS_MAJOR) {
    const minor = step * 100;
    const up = Math.ceil(dueMinor / minor) * minor;
    if (up > dueMinor && up <= dueMinor * 5) rounded.add(up);
  }
  return [dueMinor, ...[...rounded].sort((a, b) => a - b)].slice(0, 4);
}

export function TenderPanel({
  order,
  dueMinor,
  onSettled,
  onDone,
}: {
  order: StaffOrder;
  dueMinor: number;
  onSettled: () => void;
  onDone: () => void;
}) {
  const [tendered, setTendered] = React.useState("");
  const [change, setChange] = React.useState<number | null>(null);
  const [ussd, setUssd] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<"cash" | "momo" | null>(null);

  const tenderedMinor = Math.round(Number(tendered) * 100);
  const validTender = Number.isFinite(tenderedMinor) && tenderedMinor >= dueMinor;

  async function takeCash(amountMinor: number) {
    setBusy("cash");
    try {
      const result = await recordCash(order.id, dueMinor, amountMinor);
      setChange(result.changeMinor);
      onSettled();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record the cash.");
    } finally {
      setBusy(null);
    }
  }

  async function pushRequest() {
    setBusy("momo");
    try {
      const result = await requestMobileMoney(order.id);
      setUssd(result.ussdCode);
      toast.success("Payment request sent to the customer's phone.");
      onSettled();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the request.");
    } finally {
      setBusy(null);
    }
  }

  if (change !== null) {
    return (
      <div className="flex flex-col gap-4">
        <div className="bg-st-ready-bg text-st-ready rounded-xl px-4 py-5 text-center">
          <p className="text-sm font-semibold">Give back</p>
          <p className="mt-1 text-4xl leading-none font-bold tracking-tight tabular-nums">
            {formatMinor(change, order.currency)}
          </p>
        </div>
        <Button size="touch-lg" className="w-full" onClick={onDone}>
          <Check aria-hidden="true" />
          Next order
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-surface-2 rounded-xl px-4 py-3 text-center">
        <p className="text-muted-foreground text-sm font-medium">{order.reference} — to pay</p>
        <p className="mt-0.5 text-3xl leading-none font-bold tracking-tight">
          <Money minor={dueMinor} currency={order.currency} />
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Cash — what did they hand you?</p>
        <div className="grid grid-cols-2 gap-2">
          {tenderSuggestions(dueMinor).map((amount) => (
            <Button
              key={amount}
              size="touch"
              variant={amount === dueMinor ? "default" : "outline"}
              disabled={busy !== null}
              onClick={() => void takeCash(amount)}
              className="tabular-nums"
            >
              {amount === dueMinor ? "Exact" : formatMinor(amount, order.currency)}
            </Button>
          ))}
        </div>

        <div className="mt-2 flex gap-2">
          <Input
            inputMode="decimal"
            value={tendered}
            onChange={(event) => setTendered(event.target.value)}
            placeholder="Other amount"
            aria-label="Amount handed over"
            className="tabular-nums"
          />
          <Button
            size="touch"
            variant="outline"
            disabled={!validTender || busy !== null}
            onClick={() => void takeCash(tenderedMinor)}
          >
            {busy === "cash" ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Banknote aria-hidden="true" />
            )}
            Take
          </Button>
        </div>
        {tendered && !validTender ? (
          <p className="text-st-unpaid mt-1.5 text-sm">
            That is less than the {formatMinor(dueMinor, order.currency)} owed.
          </p>
        ) : null}
      </div>

      <div className="border-border border-t pt-4">
        <p className="mb-2 text-sm font-semibold">Or send a mobile money request</p>
        {ussd ? (
          <p className="bg-st-preparing-bg text-st-preparing rounded-lg px-3 py-2 text-sm">
            Ask the customer to dial{" "}
            <span className="font-mono font-semibold">{ussd}</span> — the order settles by itself
            once they pay.
          </p>
        ) : (
          <Button
            size="touch"
            variant="outline"
            className="w-full"
            disabled={busy !== null}
            onClick={() => void pushRequest()}
          >
            {busy === "momo" ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Smartphone aria-hidden="true" />
            )}
            Send to their phone
          </Button>
        )}
      </div>

      <Button
        size="touch"
        variant="ghost"
        className={cn("w-full")}
        disabled={busy !== null}
        onClick={onDone}
      >
        They will pay later — start the next order
      </Button>
    </div>
  );
}
