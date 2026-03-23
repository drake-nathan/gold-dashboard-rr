import { api } from "convex/_generated/api";
import { useMutation } from "convex/react";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export const ApproveButton = ({
  costcoProductId,
  currentPureProductId,
  matchStatus,
}: {
  costcoProductId: string;
  currentPureProductId: null | string | undefined;
  matchStatus: null | string | undefined;
}) => {
  const selectMatch = useMutation(api.admin.selectMatch);
  const confirmMatch = useMutation(api.admin.confirmMatch);
  const [loading, setLoading] = useState(false);

  const isPending = matchStatus === "pending_approval";
  const isApproved = matchStatus === "manual_matched";

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await confirmMatch({ costcoProductId });
      toast.success("Match confirmed and approved");
    } catch (error) {
      toast.error("Failed to confirm match");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!currentPureProductId) {
      toast.error("No match to approve");
      return;
    }

    setLoading(true);
    try {
      await selectMatch({
        costcoProductId,
        pureProductId: currentPureProductId,
      });
      toast.success("Match selected - click Confirm to finalize");
    } catch (error) {
      toast.error("Failed to select match");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (isApproved) {
    return (
      <Button disabled size="sm" variant="outline">
        <Check className="mr-1 h-3 w-3" />
        Approved
      </Button>
    );
  }

  if (isPending) {
    return (
      <Button
        className="bg-purple-600 hover:bg-purple-700"
        disabled={loading}
        onClick={() => {
          void handleConfirm();
        }}
        size="sm"
      >
        {loading ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <Check className="mr-1 h-3 w-3" />
        )}
        Confirm Match
      </Button>
    );
  }

  return (
    <Button
      disabled={!currentPureProductId || loading}
      onClick={() => {
        void handleApprove();
      }}
      size="sm"
    >
      {loading ? (
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
      ) : (
        <Check className="mr-1 h-3 w-3" />
      )}
      Approve Match
    </Button>
  );
};
