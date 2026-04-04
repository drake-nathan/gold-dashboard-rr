const ANONYMOUS_ID_STORAGE_KEY = "dashboard-gold-anonymous-id";

export const getOrCreateAnonymousId = (): null | string => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const existingId = window.localStorage.getItem(ANONYMOUS_ID_STORAGE_KEY);
    if (existingId) {
      return existingId;
    }

    const anonymousId = window.crypto.randomUUID();
    window.localStorage.setItem(ANONYMOUS_ID_STORAGE_KEY, anonymousId);
    return anonymousId;
  } catch {
    return window.crypto.randomUUID();
  }
};
