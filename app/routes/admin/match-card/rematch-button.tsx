import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export const RematchButton = () => {
  return (
    <Button
      onClick={() => {
        toast.info("Use 'Change' button to manually select a new match");
      }}
      size="sm"
      variant="outline"
    >
      <RefreshCw className="mr-1 h-3 w-3" />
      Rematch
    </Button>
  );
};
