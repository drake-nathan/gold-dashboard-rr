import { useAuth } from "@clerk/react-router";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";

interface UseIsAdminReturn {
  isAdmin: boolean;
  isLoading: boolean;
}

/**
 * Returns the signed-in user's admin status.
 *
 * Reactive Convex subscription — the result is cached for the session, so the
 * round-trip cost is paid once per page load. Returns `isAdmin: false` for
 * signed-out users without making a query.
 */
export const useIsAdmin = (): UseIsAdminReturn => {
  const { isLoaded, isSignedIn } = useAuth();
  const result = useQuery(api.admin.checkIsAdmin, isSignedIn ? {} : "skip");

  if (!isLoaded || !isSignedIn) {
    return { isAdmin: false, isLoading: !isLoaded };
  }

  if (result === undefined) {
    return { isAdmin: false, isLoading: true };
  }

  return { isAdmin: result.isAdmin, isLoading: false };
};
