import { SignedIn, SignedOut, useClerk, UserButton } from "@clerk/react-router";

import { Button } from "./ui/button";

export const AuthButtons = () => {
  const { openSignIn, openSignUp } = useClerk();

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
