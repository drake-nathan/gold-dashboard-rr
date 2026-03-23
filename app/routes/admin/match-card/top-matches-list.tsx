import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const TopMatchesList = ({
  costcoProductId,
  currentPureProductId,
}: {
  costcoProductId: string;
  currentPureProductId: null | string | undefined;
}) => {
  const topMatches = useQuery(api.admin.getTopMatches, {
    costcoProductId,
    limit: 5,
  });
  const selectMatch = useMutation(api.admin.selectMatch);

  if (!topMatches) {
    return (
      <div className="flex items-center justify-center py-4 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading matches...
      </div>
    );
  }

  const handleSelectMatch = async (pureProductId: string) => {
    try {
      await selectMatch({ costcoProductId, pureProductId });
      toast.success("Match selected - confirm when ready");
    } catch (error) {
      toast.error("Failed to select match");
      console.error(error);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">
        Top Matches (Score-based)
      </p>

      {topMatches.matches.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No matches found</p>
      ) : (
        <div className="space-y-1">
          {topMatches.matches.map((match, index) => (
            <div
              className={`flex items-center justify-between rounded-md border p-2 text-sm ${
                match.pureProductId === currentPureProductId
                  ? "border-green-500/50 bg-green-500/10"
                  : "hover:bg-muted/50"
              }`}
              key={match.pureProductId}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">#{index + 1}</span>
                  <span className="truncate font-medium">{match.productName}</span>
                  {match.pureProductId === currentPureProductId ? (
                    <Badge className="text-xs" variant="outline">
                      Current
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Score: {match.score} • {match.weight} oz • {match.manufacturer ?? "Unknown"}
                    {match.isGenericFallback ? " (Generic)" : null}
                  </span>
                </div>
                {match.details.length > 0 ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Matched: {match.details.join(", ")}
                  </p>
                ) : null}
              </div>
              <Button
                disabled={match.pureProductId === currentPureProductId}
                onClick={() => void handleSelectMatch(match.pureProductId)}
                size="sm"
                variant="ghost"
              >
                {match.pureProductId === currentPureProductId ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  "Select"
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {topMatches.fallback ? (
        <div className="mt-3 border-t pt-3">
          <p className="mb-2 text-xs tracking-wide text-muted-foreground uppercase">
            Weight-based Fallback
          </p>
          <div
            className={`flex items-center justify-between rounded-md border p-2 text-sm ${
              topMatches.fallback.pureProductId === currentPureProductId
                ? "border-green-500/50 bg-green-500/10"
                : "hover:bg-muted/50"
            }`}
          >
            <div>
              <span className="font-medium">{topMatches.fallback.productName}</span>
              <p className="text-xs text-muted-foreground">
                {topMatches.fallback.weight} oz • {topMatches.fallback.manufacturer ?? "Generic"}
              </p>
            </div>
            <Button
              disabled={topMatches.fallback.pureProductId === currentPureProductId}
              onClick={() => void handleSelectMatch(topMatches.fallback?.pureProductId ?? "")}
              size="sm"
              variant="ghost"
            >
              {topMatches.fallback.pureProductId === currentPureProductId ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                "Use Fallback"
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
