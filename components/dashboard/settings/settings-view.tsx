"use client";

import * as React from "react";
import { Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmAction } from "@/components/dashboard/shared/confirm-action";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import {
  DAY_LABELS,
  DAY_ORDER,
  fetchSettings,
  updateSettings,
  type BranchSettings,
  type DayKey,
} from "@/lib/admin";

/**
 * The shop's own switches (FR-SET).
 *
 * Two things get extra care here because getting them wrong costs real money:
 * the open/closed override, which is three states and not two, and the
 * WhatsApp kill switch, which silences an entire ordering channel. Both are
 * described in what-happens-next terms rather than by their field names.
 */
export function SettingsView() {
  const [settings, setSettings] = React.useState<BranchSettings | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [saving, setSaving] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const { settings: next } = await fetchSettings();
      setSettings(next);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function save(field: string, patch: Parameters<typeof updateSettings>[0]) {
    setSaving(field);
    try {
      const { settings: next } = await updateSettings(patch);
      setSettings(next);
      toast.success("Saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save that.");
      // Put the control back where it was; a switch that stayed flipped after
      // a failed save is the worst possible outcome on this screen.
      void load();
    } finally {
      setSaving(null);
    }
  }

  if (failed) {
    return (
      <div className="bg-card ring-foreground/10 rounded-xl ring-1">
        <EmptyState
          icon={Settings2}
          title="Settings did not load"
          hint="Reload the page, or check that the API is reachable."
          action={
            <Button size="touch" variant="outline" onClick={() => void load()}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  if (!settings) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-2">
      <Panel title="Are you open?">
        <div
          className={cn(
            "mb-3 rounded-lg px-3 py-2 text-sm font-semibold",
            settings.isOpenNow ? "bg-st-ready-bg text-st-ready" : "bg-st-unpaid-bg text-st-unpaid",
          )}
        >
          {settings.isOpenNow ? "Taking orders right now" : "Not taking orders right now"}
        </div>

        <div className="flex flex-col gap-2">
          {(
            [
              [null, "Follow the opening hours below", "The usual. The shop opens and closes on schedule."],
              [true, "Open, whatever the hours say", "Use this when you stay open late."],
              [false, "Closed, whatever the hours say", "Use this when you shut early. Customers cannot order."],
            ] as const
          ).map(([value, label, hint]) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => void save("override", { isOpenOverride: value })}
              aria-pressed={settings.isOpenOverride === value}
              disabled={saving !== null}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition-colors",
                settings.isOpenOverride === value
                  ? "border-brand-500 bg-brand-50"
                  : "border-border hover:bg-muted",
              )}
            >
              <span className="block text-sm font-medium">{label}</span>
              <span className="text-muted-foreground block text-xs">{hint}</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="How people can order">
        <div className="flex flex-col gap-1">
          <Toggle
            label="Delivery"
            hint="Customers give an address and pay before you cook."
            checked={settings.deliveryEnabled}
            busy={saving === "deliveryEnabled"}
            onChange={(value) => void save("deliveryEnabled", { deliveryEnabled: value })}
          />
          <Toggle
            label="Pickup"
            hint="Customers collect and pay at the counter."
            checked={settings.pickupEnabled}
            busy={saving === "pickupEnabled"}
            onChange={(value) => void save("pickupEnabled", { pickupEnabled: value })}
          />
          <Toggle
            label="Dine in"
            hint="Customers scan the code on their table."
            checked={settings.dineInEnabled}
            busy={saving === "dineInEnabled"}
            onChange={(value) => void save("dineInEnabled", { dineInEnabled: value })}
          />
        </div>

        <div className="border-border mt-4 border-t pt-4">
          <p className="text-sm font-medium">WhatsApp ordering</p>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {settings.botEnabled
              ? "The WhatsApp number answers customers and takes orders."
              : "The WhatsApp number is answering but not taking orders."}
          </p>
          {settings.botEnabled ? (
            <ConfirmAction
              trigger={
                <Button size="touch" variant="outline" className="mt-2.5">
                  Stop taking WhatsApp orders
                </Button>
              }
              title="Turn off WhatsApp ordering?"
              consequence={
                <>
                  Anyone who messages the restaurant will be told you are unavailable instead of
                  being shown the menu. Orders already in the queue are not affected, and you can
                  turn this back on at any time.
                </>
              }
              confirmLabel="Stop taking WhatsApp orders"
              onConfirm={() => save("botEnabled", { botEnabled: false })}
            />
          ) : (
            <Button
              size="touch"
              className="mt-2.5"
              disabled={saving !== null}
              onClick={() => void save("botEnabled", { botEnabled: true })}
            >
              Start taking WhatsApp orders
            </Button>
          )}
        </div>
      </Panel>

      <Panel title="Opening hours">
        <p className="text-muted-foreground mb-3 text-sm">
          Times are in {settings.timezone.replace("_", " ")}. Leave a day blank to stay closed.
        </p>
        <HoursEditor
          hours={settings.openingHours}
          busy={saving === "hours"}
          onSave={(hours) => void save("hours", { openingHours: hours })}
        />
      </Panel>

      <Panel title="Where you are">
        <DetailsForm
          settings={settings}
          busy={saving === "details"}
          onSave={(patch) => void save("details", patch)}
        />
        <p className="text-muted-foreground mt-3 text-xs">
          Currency ({settings.currency}) and timezone ({settings.timezone}) are fixed. Changing
          either would reinterpret every figure already recorded rather than change a setting.
        </p>
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card ring-foreground/10 rounded-xl p-4 ring-1">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Toggle({
  label,
  hint,
  checked,
  busy,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  busy: boolean;
  onChange: (value: boolean) => void;
}) {
  const id = React.useId();
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {busy ? (
          <Loader2 className="text-muted-foreground size-4 animate-spin" aria-hidden="true" />
        ) : null}
        <Switch id={id} checked={checked} disabled={busy} onCheckedChange={onChange} />
      </div>
    </div>
  );
}

function HoursEditor({
  hours,
  busy,
  onSave,
}: {
  hours: BranchSettings["openingHours"];
  busy: boolean;
  onSave: (hours: BranchSettings["openingHours"]) => void;
}) {
  const [draft, setDraft] = React.useState(hours);
  const dirty = JSON.stringify(draft) !== JSON.stringify(hours);

  function setDay(day: DayKey, open: string, close: string) {
    setDraft((current) => ({
      ...current,
      [day]: open && close ? [{ open, close }] : [],
    }));
  }

  return (
    <div className="flex flex-col gap-2">
      {DAY_ORDER.map((day) => {
        const window = draft[day]?.[0];
        return (
          <div key={day} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-sm">{DAY_LABELS[day]}</span>
            <Input
              type="time"
              value={window?.open ?? ""}
              aria-label={`${DAY_LABELS[day]} opening time`}
              className="w-32 tabular-nums"
              onChange={(event) => setDay(day, event.target.value, window?.close ?? "")}
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="time"
              value={window?.close ?? ""}
              aria-label={`${DAY_LABELS[day]} closing time`}
              className="w-32 tabular-nums"
              onChange={(event) => setDay(day, window?.open ?? "", event.target.value)}
            />
          </div>
        );
      })}

      <Button
        size="touch"
        className="mt-2 self-start"
        disabled={!dirty || busy}
        onClick={() => onSave(draft)}
      >
        {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        Save the hours
      </Button>
    </div>
  );
}

function DetailsForm({
  settings,
  busy,
  onSave,
}: {
  settings: BranchSettings;
  busy: boolean;
  onSave: (patch: { name: string; address: string; phoneE164: string }) => void;
}) {
  const [name, setName] = React.useState(settings.name);
  const [address, setAddress] = React.useState(settings.address);
  const [phone, setPhone] = React.useState(settings.phoneE164);

  const dirty =
    name !== settings.name || address !== settings.address || phone !== settings.phoneE164;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ name: name.trim(), address: address.trim(), phoneE164: phone.trim() });
      }}
    >
      <Field label="Restaurant name" value={name} onChange={setName} />
      <Field label="Address" value={address} onChange={setAddress} />
      <Field
        label="Phone number"
        value={phone}
        onChange={setPhone}
        hint="With the country code, like +23277900100."
        inputMode="tel"
      />
      <Button type="submit" size="touch" className="self-start" disabled={!dirty || busy}>
        {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        Save
      </Button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  inputMode?: "tel" | "text";
}) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}
