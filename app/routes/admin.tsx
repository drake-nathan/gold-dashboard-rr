import { SignIn, useUser } from "@clerk/react-router";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { Loader2, ShieldAlert } from "lucide-react";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { Route } from "./+types/admin";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Admin - Dashboard.Gold" },
    { content: "noindex, nofollow", name: "robots" },
  ];
};

const AdminPage = () => {
  const { isLoaded: isUserLoaded, isSignedIn, user } = useUser();

  // Check if user is admin (only query when signed in)
  const adminCheck = useQuery(
    api.admin.checkIsAdmin,
    isSignedIn ? {} : "skip",
  );

  // Loading state while Clerk initializes
  if (!isUserLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Not signed in - show sign in
  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold">Admin Access</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to access the admin panel
            </p>
          </div>
          <SignIn
            fallbackRedirectUrl="/admin"
            forceRedirectUrl="/admin"
            routing="hash"
          />
        </div>
      </div>
    );
  }

  // Loading admin check
  if (adminCheck === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Verifying access...</span>
        </div>
      </div>
    );
  }

  // Not an admin - show unauthorized
  if (!adminCheck.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <CardTitle>Access Denied</CardTitle>
            </div>
            <CardDescription>
              You don&apos;t have permission to access the admin panel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                Signed in as: {user?.primaryEmailAddress?.emailAddress}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                User ID: {adminCheck.userId}
              </p>
            </div>
            <Button asChild variant="outline">
              <a href="/">Return to Dashboard</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin access granted - show admin dashboard
  return <AdminDashboard />;
};

export default AdminPage;
