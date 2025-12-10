import { SignedIn, SignedOut, useClerk, UserButton } from "@clerk/react-router";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { Settings } from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";

export const AuthButtons = () => {
  const { openSignIn, openSignUp } = useClerk();

  // Check if current user is admin
  const adminCheck = useQuery(api.admin.checkIsAdmin);
  const isAdmin = adminCheck?.isAdmin ?? false;

  // Hide auth UI in production until subscription feature is ready
  const isAuthEnabled =
    import.meta.env.DEV || import.meta.env.VITE_ENABLE_AUTH === "true";

  if (!isAuthEnabled) {
    // Even if auth UI is hidden, show admin link for admins
    if (isAdmin) {
      return (
        <Button asChild size="sm" variant="ghost">
          <Link to="/admin">
            <Settings className="h-4 w-4" />
            <span className="ml-1.5">Admin</span>
          </Link>
        </Button>
      );
    }
    return null;
  }

  return (
    <>
      <SignedOut>
        <Button
          onClick={() => {
            openSignIn();
          }}
          variant="outline"
        >
          Sign In
        </Button>
        <Button
          onClick={() => {
            openSignUp();
          }}
          variant="default"
        >
          Sign Up
        </Button>
      </SignedOut>
      <SignedIn>
        {isAdmin ?
          <Button asChild size="sm" variant="ghost">
            <Link to="/admin">
              <Settings className="h-4 w-4" />
              <span className="ml-1.5">Admin</span>
            </Link>
          </Button>
        : null}
        <UserButton />
      </SignedIn>
    </>
  );
};
