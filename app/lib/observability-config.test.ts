import { expect, test } from "vitest";

import { resolveAppRelease, resolveObservabilityEnvironment } from "./observability-config";

test("normalizes production aliases", () => {
  expect(resolveObservabilityEnvironment("production")).toBe("production");
  expect(resolveObservabilityEnvironment("PROD")).toBe("production");
});

test("normalizes develop aliases", () => {
  expect(resolveObservabilityEnvironment("development")).toBe("develop");
  expect(resolveObservabilityEnvironment("preview")).toBe("develop");
  expect(resolveObservabilityEnvironment(undefined, "test")).toBe("develop");
});

test("falls back to develop when no value is supplied", () => {
  expect(resolveObservabilityEnvironment(null, undefined)).toBe("develop");
  expect(resolveObservabilityEnvironment("", "  ")).toBe("develop");
});

test("preserves non-standard environment names verbatim", () => {
  expect(resolveObservabilityEnvironment("staging")).toBe("staging");
});

test("returns the first non-empty release", () => {
  expect(resolveAppRelease(null, "", "abc123")).toBe("abc123");
  expect(resolveAppRelease(undefined, "  v1  ")).toBe("v1");
});

test("returns null when no release is supplied", () => {
  expect(resolveAppRelease()).toBeNull();
  expect(resolveAppRelease(null, undefined, "")).toBeNull();
});
