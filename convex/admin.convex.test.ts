import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

afterEach(() => {
  vi.unstubAllEnvs();
});

test("checkIsAdmin uses token identifier instead of subject", async () => {
  vi.stubEnv("ADMIN_USER_IDS", "clerk|admin-user");

  const t = convexTest(schema, modules);

  const asAdmin = t.withIdentity({
    subject: "user_admin_subject",
    tokenIdentifier: "clerk|admin-user",
  });

  const adminCheck = await asAdmin.query(api.admin.checkIsAdmin, {});

  expect(adminCheck).toStrictEqual({
    isAdmin: true,
    userTokenIdentifier: "clerk|admin-user",
  });
});

test("checkIsAdmin does not grant access for matching subject alone", async () => {
  vi.stubEnv("ADMIN_USER_IDS", "clerk|admin-user");

  const t = convexTest(schema, modules);

  const asNonAdmin = t.withIdentity({
    subject: "clerk|admin-user",
    tokenIdentifier: "clerk|different-user",
  });

  const adminCheck = await asNonAdmin.query(api.admin.checkIsAdmin, {});

  expect(adminCheck).toStrictEqual({
    isAdmin: false,
    userTokenIdentifier: "clerk|different-user",
  });
});
