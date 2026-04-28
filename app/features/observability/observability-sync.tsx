import { useAuth, useUser } from "@clerk/react-router";
import { usePostHog } from "posthog-js/react";
import { useEffect, useRef, useState } from "react";

import { useIsAdmin } from "@/features/admin/hooks/use-is-admin";
import { useSubscription } from "@/features/subscription/hooks/use-subscription";
import { resolveAppRelease, resolveObservabilityEnvironment } from "@/lib/observability-config";

import { getOrCreateAnonymousId } from "./anonymous-id";

export const ObservabilitySync = () => {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const subscription = useSubscription();
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const posthog = usePostHog();
  const [anonymousId, setAnonymousId] = useState<null | string>(null);
  const previousUserIdRef = useRef<null | string>(null);
  const lastIdentifiedIdRef = useRef<null | string>(null);
  const lastIdentifiedPersonPropsRef = useRef<null | string>(null);
  const appEnvironment = resolveObservabilityEnvironment(
    import.meta.env.VITE_APP_ENVIRONMENT,
    import.meta.env.MODE,
  );
  const appRelease = resolveAppRelease(import.meta.env.VITE_APP_RELEASE);
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const subscriptionStatus = subscription.subscription.status;
  const isPro = subscription.isPro;
  // Hold off on identifying with subscription/admin state until the queries
  // have resolved so we don't flicker the person record between defaults and
  // actual values on every navigation.
  const subscriptionResolved = !subscription.isLoading;
  const adminResolved = !isAdminLoading;

  useEffect(() => {
    setAnonymousId(getOrCreateAnonymousId());
  }, []);

  useEffect(() => {
    if (!anonymousId || !isLoaded) {
      return;
    }

    const authState = isSignedIn && userId ? "authenticated" : "anonymous";
    const sharedProperties = {
      anonymous_id: anonymousId,
      auth_state: authState,
      environment: appEnvironment,
      ...(appRelease ? { release: appRelease } : {}),
      signed_in: isSignedIn,
      ...(userId ? { user_id: userId } : {}),
      ...(email ? { email } : {}),
      ...(isSignedIn && subscriptionResolved
        ? { is_pro: isPro, subscription_status: subscriptionStatus }
        : {}),
      ...(isSignedIn && adminResolved ? { is_admin: isAdmin } : {}),
    };
    const distinctId = userId ?? anonymousId;
    const isLoggingOut = previousUserIdRef.current !== null && !userId;

    if (isLoggingOut) {
      posthog.reset();
      lastIdentifiedIdRef.current = null;
      lastIdentifiedPersonPropsRef.current = null;
    }

    // Re-identify when person-level properties change for the same user.
    // posthog.register() only updates super properties on events; person
    // properties used by feature-flag targeting (e.g. is_admin, is_pro)
    // require an identify call. Async Convex queries (admin, subscription)
    // resolve after the first identify, so without re-identifying those
    // values would never reach the person record.
    const personPropsSignature = JSON.stringify({
      auth_state: authState,
      email,
      is_admin: isSignedIn && adminResolved ? isAdmin : null,
      is_pro: isSignedIn && subscriptionResolved ? isPro : null,
      subscription_status: isSignedIn && subscriptionResolved ? subscriptionStatus : null,
      user_id: userId ?? null,
    });

    const shouldIdentify =
      lastIdentifiedIdRef.current !== distinctId ||
      lastIdentifiedPersonPropsRef.current !== personPropsSignature;

    if (shouldIdentify) {
      posthog.identify(distinctId, sharedProperties);
      lastIdentifiedIdRef.current = distinctId;
      lastIdentifiedPersonPropsRef.current = personPropsSignature;
    }

    posthog.register(sharedProperties);
    previousUserIdRef.current = userId ?? null;
  }, [
    adminResolved,
    anonymousId,
    appEnvironment,
    appRelease,
    email,
    isAdmin,
    isLoaded,
    isPro,
    isSignedIn,
    posthog,
    subscriptionResolved,
    subscriptionStatus,
    userId,
  ]);

  return null;
};
