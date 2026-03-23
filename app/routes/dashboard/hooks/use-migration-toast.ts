import { useEffect, useRef } from "react";
import { toast } from "sonner";

export const useMigrationToast = (isMigrating: boolean) => {
  const migrationToastId = useRef<number | string | undefined>(undefined);

  useEffect(() => {
    if (isMigrating && !migrationToastId.current) {
      migrationToastId.current = toast.loading("Syncing your card settings...");
    } else if (!isMigrating && migrationToastId.current) {
      toast.success("Settings synced!", { id: migrationToastId.current });
      migrationToastId.current = undefined;
    }
  }, [isMigrating]);
};
