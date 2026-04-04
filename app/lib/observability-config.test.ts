import { expect, test } from "vitest";

import { shouldEnableSentry } from "./observability-config";

test("disables Sentry without a DSN", () => {
  expect(shouldEnableSentry()).toBeFalsy();
  expect(
    shouldEnableSentry({
      dsn: "",
      isLocalDevRuntime: false,
    }),
  ).toBeFalsy();
});

test("disables Sentry by default in local dev runtimes", () => {
  expect(
    shouldEnableSentry({
      dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
      isLocalDevRuntime: true,
    }),
  ).toBeFalsy();
});

test("allows explicitly re-enabling Sentry in local dev runtimes", () => {
  expect(
    shouldEnableSentry({
      dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
      isLocalDevRuntime: true,
      localOverride: "true",
    }),
  ).toBeTruthy();
});

test("keeps Sentry enabled for non-local runtimes when a DSN is present", () => {
  expect(
    shouldEnableSentry({
      dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
      isLocalDevRuntime: false,
    }),
  ).toBeTruthy();
});
