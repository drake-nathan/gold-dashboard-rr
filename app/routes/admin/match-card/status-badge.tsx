import { Badge } from "@/components/ui/badge";

export const StatusBadge = ({ status }: { status: null | string | undefined }) => {
  switch (status) {
    case "auto_matched": {
      return <Badge className="border-blue-500/30 bg-blue-500/10 text-blue-600">Auto</Badge>;
    }
    case "fallback": {
      return (
        <Badge className="border-yellow-500/30 bg-yellow-500/10 text-yellow-600">Fallback</Badge>
      );
    }
    case "manual_matched": {
      return <Badge className="border-green-500/30 bg-green-500/10 text-green-600">Approved</Badge>;
    }
    case "needs_review": {
      return (
        <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-600">Review</Badge>
      );
    }
    case "pending_approval": {
      return (
        <Badge className="border-purple-500/30 bg-purple-500/10 text-purple-600">Pending</Badge>
      );
    }
    default: {
      return <Badge variant="outline">Unmatched</Badge>;
    }
  }
};
