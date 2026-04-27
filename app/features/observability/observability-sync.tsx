import { useAuth } from "@clerk/react-router";
import { usePostHog } from "posthog-js/react";
import { useEffect, useRef, useState } from "react";

import { resolveAppRelease, resolveObservabilityEnvironment } from "@/lib/observability-config";

import { getOrCreateAnonymousId } from "./anonymous-id";

export const ObservabilitySync = () => {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const posthog = usePostHog();
  const [anonymousId, setAnonymousId] = useState<null | string>(null);
  const previousUserIdRef = useRef<null | string>(null);
  const lastIdentifiedIdRef = useRef<null | string>(null);
  const appEnvironment = resolveObservabilityEnvironment(
    import.meta.env.VITE_APP_ENVIRONMENT,
    import.meta.env.MODE,
  );
  const appRelease = resolveAppRelease(import.meta.env.VITE_APP_RELEASE);

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
    };
    const distinctId = userId ?? anonymousId;
    const isLoggingOut = previousUserIdRef.current !== null && !userId;

    if (isLoggingOut) {
      posthog.reset();
      lastIdentifiedIdRef.current = null;
    }

    if (lastIdentifiedIdRef.current !== distinctId) {
      posthog.identify(distinctId, sharedProperties);
      lastIdentifiedIdRef.current = distinctId;
    }

    posthog.register(sharedProperties);
    previousUserIdRef.current = userId ?? null;
  }, [anonymousId, appEnvironment, appRelease, isLoaded, isSignedIn, posthog, userId]);

  return null;
};
