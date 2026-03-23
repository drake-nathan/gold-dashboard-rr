import { SignIn, useUser } from "@clerk/react-router";
import { getAuth } from "@clerk/react-router/server";
import { api } from "convex/_generated/api";
// React Router uses the same server-side Convex helper exposed from convex/nextjs.
import { fetchQuery } from "convex/nextjs";
import { ShieldAlert } from "lucide-react";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { Route } from "./+types/admin";

export const meta: Route.MetaFunction = () => {
  return [{ title: "Admin - Dashboard.Gold" }, { content: "noindex, nofollow", name: "robots" }];
};

export const loader = async (args: Route.LoaderArgs) => {
  const convexUrl = process.env.VITE_CONVEX_URL;

  if (!convexUrl) {
    throw new Error("VITE_CONVEX_URL is not set");
  }

  const auth = await getAuth(args);
  const token = await auth.getToken({ template: "convex" });

  if (!token) {
    return {
      adminCheck: {
        isAdmin: false,
        userTokenIdentifier: null,
      },
      isAuthenticated: false,
      productsData: null,
    };
  }

  const adminCheck = await fetchQuery(
    api.admin.checkIsAdmin,
    {},
    {
      token,
      url: convexUrl,
    },
  );

  if (!adminCheck.isAdmin) {
    return {
      adminCheck,
      isAuthenticated: true,
      productsData: null,
    };
  }

  const productsData = await fetchQuery(
    api.admin.getProductsForReview,
    {},
    {
      token,
      url: convexUrl,
    },
  );

  return {
    adminCheck,
    isAuthenticated: true,
    productsData,
  };
};

const AdminPage = ({ loaderData }: Route.ComponentProps) => {
  const { isLoaded: isUserLoaded, user } = useUser();

  // Not signed in - show sign in
  if (!loaderData.isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold">Admin Access</h1>
            <p className="text-sm text-muted-foreground">Sign in to access the admin panel</p>
          </div>
          <SignIn fallbackRedirectUrl="/admin" forceRedirectUrl="/admin" routing="hash" />
        </div>
      </div>
    );
  }

  // Not an admin - show unauthorized
  if (!loaderData.adminCheck.isAdmin) {
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
              {isUserLoaded ? (
                <p className="text-sm text-muted-foreground">
                  Signed in as: {user?.primaryEmailAddress?.emailAddress}
                </p>
              ) : null}
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Token ID: {loaderData.adminCheck.userTokenIdentifier}
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

  return <AdminDashboard productsData={loaderData.productsData!} />;
};

export default AdminPage;
