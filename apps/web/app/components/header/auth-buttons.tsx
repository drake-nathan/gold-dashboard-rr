import { SignedIn, SignedOut, useClerk, UserButton } from "@clerk/react-router";

import { env } from "@gold-dashboard/env/client";

import { Button } from "@/components/ui/button";

export const AuthButtons = () => {
  const { openSignIn, openSignUp } = useClerk();

  // Hide auth UI in production until subscription feature is ready
  const isAuthEnabled =
    import.meta.env.DEV || env.VITE_ENABLE_AUTH === "true";

  if (!isAuthEnabled) {
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
        <UserButton />
      </SignedIn>
    </>
  );
};
