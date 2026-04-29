import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import { FeedbackButton } from "./feedback-button";

let mockAuthState: { isSignedIn: boolean } = { isSignedIn: false };
const submitFeedbackMock = vi.fn();
const captureMock = vi.fn();
const getDistinctIdMock = vi.fn(() => "distinct_test");
const getSessionIdMock = vi.fn(() => "session_test");

vi.mock("@clerk/react-router", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("convex/react", () => ({
  useAction: () => submitFeedbackMock,
}));

vi.mock("posthog-js/react", () => ({
  usePostHog: () => ({
    capture: captureMock,
    get_distinct_id: getDistinctIdMock,
    get_session_id: getSessionIdMock,
  }),
}));

const renderFeedbackButton = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <FeedbackButton />
    </MemoryRouter>,
    {
      wrapper: ({ children }: { children: ReactNode }) => children,
    },
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthState = { isSignedIn: false };
  submitFeedbackMock.mockResolvedValue({ ok: true });
});

test("opens the dialog and submits feedback through the action", async () => {
  const screen = await renderFeedbackButton();

  const launcher = screen.getByRole("button", { name: "Send feedback" });
  await launcher.click();

  expect(captureMock).toHaveBeenCalledWith(
    "feedback_dialog_opened",
    expect.objectContaining({ is_signed_in: false, path: "/dashboard" }),
  );

  const messageBox = screen.getByLabelText("Message");
  await messageBox.fill("The dashboard table is misaligned");

  // The submit button shares its accessible name with the launcher's aria-label,
  // so disambiguate by the explicit type attribute.
  const submitButton = document.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!submitButton) throw new Error("Submit button not found");
  submitButton.click();

  await vi.waitFor(() => {
    expect(submitFeedbackMock).toHaveBeenCalledTimes(1);
  });

  const payload = submitFeedbackMock.mock.calls[0][0] as Record<string, unknown>;
  expect(payload.message).toBe("The dashboard table is misaligned");
  expect(payload.path).toBe("/dashboard");
  expect(payload.posthogDistinctId).toBe("distinct_test");
  expect(payload.posthogSessionId).toBe("session_test");
  expect(payload.userAgent).toEqual(expect.any(String));
  expect(payload.viewport).toMatch(/^\d+x\d+$/);
  expect(payload.website).toBeUndefined();

  expect(captureMock).toHaveBeenCalledWith(
    "feedback_submitted",
    expect.objectContaining({ is_signed_in: false }),
  );
});

test("forwards a tripped honeypot value to the action", async () => {
  const screen = await renderFeedbackButton();

  const launcher = screen.getByRole("button", { name: "Send feedback" });
  await launcher.click();

  const messageBox = screen.getByLabelText("Message");
  await messageBox.fill("Bot message");

  // Honeypot input is visually hidden so it has no accessible name; bots fill
  // it via raw DOM, so the test simulates the same path.
  const honeypot = document.querySelector<HTMLInputElement>("#feedback-website");
  if (!honeypot) throw new Error("Honeypot input not found");
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(honeypot, "https://spammy.example");
  honeypot.dispatchEvent(new Event("input", { bubbles: true }));

  const submitButton = document.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!submitButton) throw new Error("Submit button not found");
  submitButton.click();

  await vi.waitFor(() => {
    expect(submitFeedbackMock).toHaveBeenCalledTimes(1);
  });

  const payload = submitFeedbackMock.mock.calls[0][0] as Record<string, unknown>;
  expect(payload.website).toBe("https://spammy.example");
});
