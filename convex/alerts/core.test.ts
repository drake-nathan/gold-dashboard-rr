import { expect, test } from "vitest";

import { unsubscribePayloadFor } from "./core";

// These payloads are the data signed inside the unsubscribe HMAC. Asymmetry
// between kinds is what prevents an alerts unsubscribe link from being
// promoted to a digest unsubscribe (or vice versa) by appending/removing
// `&kind=digest` in the URL.

test("unsubscribePayloadFor preserves the legacy alerts payload as bare userId", () => {
  expect(unsubscribePayloadFor("user_abc", "alerts")).toBe("user_abc");
});

test("unsubscribePayloadFor binds non-alert kinds into the signed payload", () => {
  expect(unsubscribePayloadFor("user_abc", "digest")).toBe("digest|user_abc");
});

test("unsubscribePayloadFor differs across kinds for the same userId", () => {
  const userId = "user_abc";
  expect(unsubscribePayloadFor(userId, "alerts")).not.toBe(unsubscribePayloadFor(userId, "digest"));
});
