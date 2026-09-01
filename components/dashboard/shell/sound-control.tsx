"use client";

import { Bell, BellOff, BellRing } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useOrderAlerts } from "@/components/dashboard/shell/order-alerts";

/**
 * FR-POS-3's missing half.
 *
 * A browser will not start an AudioContext without a gesture, so the chime the
 * queue used to play was inaudible on exactly the screen it was written for:
 * an unattended counter tab nobody had clicked. There was also no way to find
 * that out short of missing an order.
 *
 * So sound is turned on deliberately, and the act of turning it on plays the
 * sound back as proof. When there are unheard orders the control becomes the
 * acknowledgement — tapping it silences the repeat.
 */
export function SoundControl() {
  const { soundWanted, soundArmed, armSound, muteSound, unseen, acknowledge } = useOrderAlerts();

  if (!soundWanted) {
    return (
      <Button size="touch" variant="outline" onClick={armSound}>
        <Bell aria-hidden="true" />
        <span className="hidden sm:inline">Turn on order alerts</span>
        <span className="sm:hidden">Alerts</span>
      </Button>
    );
  }

  if (unseen > 0) {
    return (
      <Button size="touch" onClick={acknowledge} className="relative">
        <BellRing aria-hidden="true" className="throb" />
        {unseen} new {unseen === 1 ? "order" : "orders"}
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon-touch" variant="ghost" onClick={muteSound}>
          {soundArmed ? <Bell aria-hidden="true" /> : <BellOff aria-hidden="true" />}
          <span className="sr-only">Turn off order alerts</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {soundArmed
          ? "Order alerts are on. Tap to turn them off."
          : "Alerts are on, but this tab has not been touched yet — tap anywhere to let it make sound."}
      </TooltipContent>
    </Tooltip>
  );
}
