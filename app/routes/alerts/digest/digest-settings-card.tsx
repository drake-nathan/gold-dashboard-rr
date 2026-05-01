import { api } from "convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { Mail } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { useState } from "react";
import { toast } from "sonner";

import { UpgradeButton } from "@/components/subscription/upgrade-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type DigestFrequency = "daily" | "off" | "weekly";

const formatLastSent = (timestamp: number | undefined): null | string => {
  if (!timestamp) return null;
  const sent = new Date(timestamp);
  return `Last sent ${sent.toLocaleString(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  })}`;
};

export const DigestSettingsCard = ({ canSendAlerts }: { canSendAlerts: boolean }) => {
  const posthog = usePostHog();
  const settings = useQuery(api.userSettings.getSettings, {});
  const updateDigestPreferences = useMutation(api.userSettings.updateDigestPreferences);
  const sendPreviewDigest = useAction(api.digests.sendPreviewDigest);
  const [isSendingPreview, setIsSendingPreview] = useState(false);

  const currentFrequency: DigestFrequency = settings?.digestFrequency ?? "off";
  const lastSentLabel = formatLastSent(settings?.digestLastSentAt);

  const onChangeFrequency = async (next: DigestFrequency) => {
    if (next === currentFrequency) return;
    if (next !== "off" && !canSendAlerts) {
      toast.error("Active Pro subscription required to enable the digest");
      return;
    }
    try {
      await updateDigestPreferences({ frequency: next });
      posthog.capture("digest_frequency_changed", { frequency: next });
      toast.success(
        next === "off"
          ? "Email digest disabled"
          : `Email digest set to ${next === "weekly" ? "weekly (Mondays)" : "daily"}`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update digest");
    }
  };

  const onSendPreview = async () => {
    setIsSendingPreview(true);
    try {
      const result = await sendPreviewDigest({});
      if (result.success) {
        toast.success("Preview sent — check your inbox");
        posthog.capture("digest_preview_sent");
      } else {
        toast.error(result.error ?? "Failed to send preview");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send preview");
    } finally {
      setIsSendingPreview(false);
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Mail className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Email digest</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                A snapshot of every in-stock Costco gold &amp; silver product with bids and markup
                over spot. Sent at 15:00 UTC (~10 AM ET).
              </p>
              {lastSentLabel ? (
                <p className="mt-1 text-xs text-muted-foreground/80 tabular-nums">
                  {lastSentLabel}
                </p>
              ) : null}
            </div>
          </div>
          {!canSendAlerts ? <UpgradeButton size="sm" /> : null}
        </div>

        <ToggleGroup
          className="w-full"
          disabled={!canSendAlerts && currentFrequency === "off"}
          onValueChange={(groupValue) => {
            const nextValue = groupValue[0];
            if (!nextValue) return;
            void onChangeFrequency(nextValue as DigestFrequency);
          }}
          value={[currentFrequency]}
          variant="outline"
        >
          <ToggleGroupItem aria-label="Digest off" className="flex-1" value="off">
            Off
          </ToggleGroupItem>
          <ToggleGroupItem aria-label="Daily digest" className="flex-1" value="daily">
            Daily
          </ToggleGroupItem>
          <ToggleGroupItem aria-label="Weekly digest" className="flex-1" value="weekly">
            Weekly (Mon)
          </ToggleGroupItem>
        </ToggleGroup>

        {currentFrequency !== "off" && canSendAlerts ? (
          <div>
            <Button
              disabled={isSendingPreview}
              onClick={() => {
                void onSendPreview();
              }}
              size="sm"
              variant="outline"
            >
              {isSendingPreview ? "Sending…" : "Send me a preview"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
