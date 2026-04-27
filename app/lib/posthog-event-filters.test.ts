import { expect, test } from "vitest";

import { shouldDropClientEvent, shouldDropServerError } from "./posthog-event-filters";

test("drops benign React Router navigation aborts on the client", () => {
  const event = {
    event: "$exception",
    properties: {
      $exception_list: [
        {
          mechanism: { type: "react_router.client_loader" },
          type: "AbortError",
          value: "signal is aborted without reason",
        },
      ],
    },
  };

  expect(shouldDropClientEvent(event)).toBeTruthy();
});

test("ignores non-exception PostHog events", () => {
  const event = {
    event: "$pageview",
    properties: {
      $current_url: "https://dashboard.gold/",
    },
  };

  expect(shouldDropClientEvent(event)).toBeFalsy();
});

test("keeps real client exceptions", () => {
  const event = {
    event: "$exception",
    properties: {
      $exception_list: [
        {
          mechanism: { type: "auto.browser.global_handlers.onerror" },
          type: "TypeError",
          value: "Cannot read properties of undefined",
        },
      ],
    },
  };

  expect(shouldDropClientEvent(event)).toBeFalsy();
});

test("drops framework 404 server noise", () => {
  expect(
    shouldDropServerError({
      error: Object.assign(new Error('No route matches URL "/robots.txt"'), {
        name: "NotFoundException",
      }),
    }),
  ).toBeTruthy();

  expect(
    shouldDropServerError({
      error: new Error("404"),
      status: 404,
    }),
  ).toBeTruthy();
});

test("drops missing action POST / framework noise", () => {
  expect(
    shouldDropServerError({
      error: new Error(
        'You made a POST request to "/", but did not provide an `action` for route "root"',
      ),
      status: 405,
    }),
  ).toBeTruthy();
});

test("drops stackless uptime POST / failures", () => {
  const error = new Error("Unexpected Server Error");
  error.stack = undefined as unknown as string;

  expect(
    shouldDropServerError({
      error,
      request: {
        headers: new Headers({ "user-agent": "Mozilla/5.0 scanner" }),
        method: "POST",
        url: "https://dashboard.gold/",
      },
    }),
  ).toBeTruthy();
});

test("drops UptimeBot user-agent failures", () => {
  const error = new Error("Unexpected Server Error");
  error.stack = undefined as unknown as string;

  expect(
    shouldDropServerError({
      error,
      request: {
        headers: new Headers({ "user-agent": "UptimeBot/1.0" }),
        method: "GET",
        url: "https://dashboard.gold/",
      },
    }),
  ).toBeTruthy();
});

test("keeps real stackful server errors", () => {
  expect(
    shouldDropServerError({
      error: new Error("Database query failed"),
      request: {
        headers: new Headers(),
        method: "GET",
        url: "https://dashboard.gold/",
      },
    }),
  ).toBeFalsy();
});
