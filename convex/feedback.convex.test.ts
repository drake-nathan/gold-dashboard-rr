import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

// Snapshots and restores selected env vars. Restoration deletes keys whose
// original value was undefined, since `process.env.X = undefined` coerces to
// the string "undefined" and would pollute later tests.
const snapshotEnv = (keys: readonly string[]) => {
  const snapshot = new Map<string, string | undefined>();
  for (const key of keys) snapshot.set(key, process.env[key]);
  return () => {
    for (const [key, value] of snapshot) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
};

const RESEND_ENV_KEYS = [
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "SUPPORT_EMAIL",
  "POSTHOG_PROJECT_URL",
] as const;

const setupResendEnv = () => {
  const restore = snapshotEnv(RESEND_ENV_KEYS);
  process.env.RESEND_API_KEY = "test_resend_api_key";
  process.env.RESEND_FROM_EMAIL = "alerts@example.com";
  process.env.SUPPORT_EMAIL = "support@example.com";
  return restore;
};

const okFetchMock = () =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    json: () => Promise.resolve({ id: "email_feedback_1" }),
    ok: true,
    status: 200,
    statusText: "OK",
  } as Response);

test("submit sends an email to the support address with anonymous metadata", async () => {
  const t = convexTest(schema, modules);
  const restore = setupResendEnv();
  const fetchMock = okFetchMock();

  try {
    const result = await t.action(api.feedback.submit, {
      email: "user@example.com",
      message: "Pricing column is wrong on /alerts",
      path: "/alerts?foo=1",
    });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();

    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    const body = typeof requestInit.body === "string" ? JSON.parse(requestInit.body) : null;
    if (!body) throw new Error("Expected JSON body");

    expect(body.to).toEqual(["support@example.com"]);
    expect(body.from).toBe("alerts@example.com");
    expect(body.reply_to).toBe("user@example.com");
    expect(body.subject).toContain("Pricing column is wrong");
    expect(body.text).toContain("Email: user@example.com");
    expect(body.text).toContain("User ID: anonymous");
    expect(body.text).toContain("Path: /alerts?foo=1");
    expect(body.text).toContain("Pricing column is wrong on /alerts");
  } finally {
    fetchMock.mockRestore();
    restore();
  }
});

test("submit attaches signed-in identity to the feedback email", async () => {
  const t = convexTest(schema, modules);
  const restore = setupResendEnv();
  const fetchMock = okFetchMock();

  const asUser = t.withIdentity({
    email: "alice@example.com",
    name: "Alice",
    subject: "user_feedback_1",
  });

  try {
    await asUser.action(api.feedback.submit, {
      message: "Loving the new dashboard!",
    });

    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    const body = typeof requestInit.body === "string" ? JSON.parse(requestInit.body) : null;
    if (!body) throw new Error("Expected JSON body");

    expect(body.text).toContain("Name: Alice");
    expect(body.text).toContain("Email: alice@example.com");
    expect(body.text).toContain("User ID: user_feedback_1");
    expect(body.reply_to).toBe("alice@example.com");
  } finally {
    fetchMock.mockRestore();
    restore();
  }
});

test("submit renders PostHog person/session links when POSTHOG_PROJECT_URL is set", async () => {
  const t = convexTest(schema, modules);
  const restore = setupResendEnv();
  process.env.POSTHOG_PROJECT_URL = "https://us.posthog.com/project/242217/";
  const fetchMock = okFetchMock();

  try {
    await t.action(api.feedback.submit, {
      environment: "production",
      message: "Something is wrong",
      posthogDistinctId: "abc-123",
      posthogSessionId: "sess-xyz",
      release: "git-sha-abcdef",
      userAgent: "Mozilla/5.0 (Macintosh)",
      viewport: "1920x1080",
    });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);

    expect(body.text).toContain(
      "PostHog person: abc-123 (https://us.posthog.com/project/242217/person/abc-123)",
    );
    expect(body.text).toContain(
      "PostHog session: sess-xyz (https://us.posthog.com/project/242217/replay/sess-xyz)",
    );
    expect(body.text).toContain("User agent: Mozilla/5.0 (Macintosh)");
    expect(body.text).toContain("Viewport: 1920x1080");
    expect(body.text).toContain("Release: git-sha-abcdef");
    expect(body.text).toContain("Environment: production");

    expect(body.html).toContain('href="https://us.posthog.com/project/242217/person/abc-123"');
    expect(body.html).toContain('href="https://us.posthog.com/project/242217/replay/sess-xyz"');
  } finally {
    fetchMock.mockRestore();
    restore();
  }
});

test("submit omits PostHog links when POSTHOG_PROJECT_URL is unset but still includes IDs", async () => {
  const t = convexTest(schema, modules);
  const restore = setupResendEnv();
  delete process.env.POSTHOG_PROJECT_URL;
  const fetchMock = okFetchMock();

  try {
    await t.action(api.feedback.submit, {
      message: "Something is wrong",
      posthogDistinctId: "abc-123",
      posthogSessionId: "sess-xyz",
    });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);

    expect(body.text).toContain("PostHog person: abc-123");
    expect(body.text).not.toContain("(https://");
    expect(body.html).not.toContain("href=");
  } finally {
    fetchMock.mockRestore();
    restore();
  }
});

test("submit silently no-ops when the honeypot field is filled", async () => {
  const t = convexTest(schema, modules);
  const restore = setupResendEnv();
  const fetchMock = okFetchMock();
  const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

  try {
    const result = await t.action(api.feedback.submit, {
      message: "This came from a bot",
      website: "https://spammy.example",
    });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(consoleWarn).toHaveBeenCalledWith("Feedback honeypot tripped", expect.any(Object));
  } finally {
    consoleWarn.mockRestore();
    fetchMock.mockRestore();
    restore();
  }
});

test("submit ignores client-supplied email when the caller is signed in", async () => {
  const t = convexTest(schema, modules);
  const restore = setupResendEnv();
  const fetchMock = okFetchMock();

  const asUser = t.withIdentity({
    email: "alice@example.com",
    name: "Alice",
    subject: "user_feedback_spoof",
  });

  try {
    await asUser.action(api.feedback.submit, {
      email: "attacker@evil.example",
      message: "Trying to spoof reply_to",
    });

    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    const body = typeof requestInit.body === "string" ? JSON.parse(requestInit.body) : null;
    if (!body) throw new Error("Expected JSON body");

    expect(body.reply_to).toBe("alice@example.com");
    expect(body.text).toContain("Email: alice@example.com");
    expect(body.text).not.toContain("attacker@evil.example");
  } finally {
    fetchMock.mockRestore();
    restore();
  }
});

test("submit rejects messages that are too short", async () => {
  const t = convexTest(schema, modules);
  const restore = setupResendEnv();
  const fetchMock = okFetchMock();

  try {
    await expect(t.action(api.feedback.submit, { message: "  " })).rejects.toThrow(
      /longer message/i,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    fetchMock.mockRestore();
    restore();
  }
});

test("submit rejects invalid email addresses", async () => {
  const t = convexTest(schema, modules);
  const restore = setupResendEnv();
  const fetchMock = okFetchMock();

  try {
    await expect(
      t.action(api.feedback.submit, {
        email: "not-an-email",
        message: "This should be rejected",
      }),
    ).rejects.toThrow(/email address/i);
    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    fetchMock.mockRestore();
    restore();
  }
});

test("submit fails fast when Resend is not configured", async () => {
  const t = convexTest(schema, modules);
  const restore = snapshotEnv(RESEND_ENV_KEYS);
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  delete process.env.SUPPORT_EMAIL;
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

  try {
    await expect(t.action(api.feedback.submit, { message: "Anything at all" })).rejects.toThrow(
      /isn't configured/i,
    );
    expect(consoleError).toHaveBeenCalledWith(
      "Feedback delivery is not configured",
      expect.objectContaining({ hasApiKey: false, hasFromEmail: false, hasSupportEmail: false }),
    );
  } finally {
    consoleError.mockRestore();
    restore();
  }
});

test("submit fails when SUPPORT_EMAIL is missing even if Resend is configured", async () => {
  const t = convexTest(schema, modules);
  const restore = snapshotEnv(RESEND_ENV_KEYS);
  process.env.RESEND_API_KEY = "test_resend_api_key";
  process.env.RESEND_FROM_EMAIL = "alerts@example.com";
  delete process.env.SUPPORT_EMAIL;
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  const fetchMock = okFetchMock();

  try {
    await expect(t.action(api.feedback.submit, { message: "Anything at all" })).rejects.toThrow(
      /isn't configured/i,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    consoleError.mockRestore();
    fetchMock.mockRestore();
    restore();
  }
});

test("submit surfaces a generic error when Resend returns a failure", async () => {
  const t = convexTest(schema, modules);
  const restore = setupResendEnv();
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
    json: () => Promise.resolve({ message: "rate limited" }),
    ok: false,
    status: 429,
    statusText: "Too Many Requests",
  } as Response);
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

  try {
    await expect(
      t.action(api.feedback.submit, { message: "This will fail to send" }),
    ).rejects.toThrow(/couldn't send feedback/i);
    expect(consoleError).toHaveBeenCalled();
  } finally {
    consoleError.mockRestore();
    fetchMock.mockRestore();
    restore();
  }
});
