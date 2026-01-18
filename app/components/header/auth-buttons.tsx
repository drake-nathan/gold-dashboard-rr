import { SignedIn, SignedOut, useClerk, UserButton } from "@clerk/react-router";
import { Settings } from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";

interface AuthButtonsProps {
  isAdmin: boolean;
}

export const AuthButtons = ({ isAdmin }: AuthButtonsProps) => {
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
