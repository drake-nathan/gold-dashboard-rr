/**
 * Upgrade Flow Provider
 *
 * Owns the open state of the global UpgradeDialog so any surface — header
 * button, announcement modal, alerts page banner, product card upsell — can
 * trigger checkout without re-implementing the open/close + Stripe glue.
 *
 * Every caller passes a `source` identifier so `upgrade_dialog_opened` lands
 * in PostHog with consistent attribution. That funnel property is the whole
 * reason this is centralized: it lets us compare which surfaces are pulling
 * weight without instrumentation drift across components.
 */

import { useAuth } from "@clerk/react-router";
import { usePostHog } from "posthog-js/react";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useLocation } from "react-router";
import { toast } from "sonner";

import { UpgradeDialog } from "@/components/subscription/upgrade-dialog";
import { useSubscription } from "@/features/subscription/hooks/use-subscription";
import {
  UpgradeFlowContext,
  type UpgradeFlowContextValue,
  type UpgradeFlowSource,
} from "@/features/subscription/use-upgrade-flow";

export const UpgradeFlowProvider = ({ children }: { children: ReactNode }) => {
  const { isSignedIn } = useAuth();
  const location = useLocation();
  const posthog = usePostHog();
  const { createCheckout, isActionLoading } = useSubscription();
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(
    (source: UpgradeFlowSource) => {
      posthog.capture("upgrade_dialog_opened", { source });
      setIsOpen(true);
    },
    [posthog],
  );

  const handleCheckout = useCallback(async () => {
    if (!isSignedIn) {
      toast.error("Please sign in to upgrade");
      return;
    }

    posthog.capture("upgrade_checkout_started");

    try {
      const result = await createCheckout(`${location.pathname}${location.search}${location.hash}`);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.url) {
        window.location.assign(result.url);
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    } catch {
      toast.error("Failed to start checkout. Please try again.");
    }
  }, [createCheckout, isSignedIn, location.hash, location.pathname, location.search, posthog]);

  const value = useMemo<UpgradeFlowContextValue>(() => ({ open }), [open]);

  return (
    <UpgradeFlowContext.Provider value={value}>
      {children}
      <UpgradeDialog
        isLoading={isActionLoading}
        onConfirm={() => {
          void handleCheckout();
        }}
        onOpenChange={setIsOpen}
        open={isOpen}
      />
    </UpgradeFlowContext.Provider>
  );
};
