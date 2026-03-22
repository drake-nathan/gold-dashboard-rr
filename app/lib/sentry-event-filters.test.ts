import { expect, test } from "vitest";

import { shouldDropClientEvent, shouldDropServerEvent } from "./sentry-event-filters";

test("drops benign React Router navigation aborts on the client", () => {
  const event = {
    exception: {
      values: [
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

test("drops Mobile Safari timeout noise from OpenTelemetry wrappers", () => {
  const event = {
    exception: {
      values: [
        {
          mechanism: { type: "auto.browser.global_handlers.onunhandledrejection" },
          stacktrace: {
            frames: [{ filename: "/node_modules/@opentelemetry/core/build/esm/utils/timeout.js" }],
          },
          type: "Error",
          value: "Operation timed out.",
        },
      ],
    },
    tags: {
      "browser.name": "Mobile Safari",
    },
  };

  expect(shouldDropClientEvent(event)).toBeTruthy();
});

test("keeps real client exceptions", () => {
  const event = {
    exception: {
      values: [
        {
          mechanism: { type: "auto.browser.global_handlers.onerror" },
          type: "TypeError",
          value: "Cannot read properties of undefined",
        },
      ],
    },
    tags: {
      "browser.name": "Chrome",
    },
  };

  expect(shouldDropClientEvent(event)).toBeFalsy();
});

test("drops framework 404 and missing action server noise", () => {
  const event = {
    exception: {
      values: [
        {
          type: "NotFoundException",
          value: 'No route matches URL "/robots.txt"',
        },
      ],
    },
  };

  expect(shouldDropServerEvent(event)).toBeTruthy();
});

test("drops stackless generic root failures from scanners and uptime checks", () => {
  const postRootEvent = {
    exception: {
      values: [
        {
          mechanism: { type: "generic" },
          type: "Error",
          value: "Unexpected Server Error",
        },
      ],
    },
    transaction: "POST /",
  };

  const uptimeEvent = {
    exception: {
      values: [
        {
          mechanism: { type: "generic" },
          type: "Error",
          value: "Unexpected Server Error",
        },
      ],
    },
    tags: {
      "browser.name": "SentryUptimeBot",
    },
    transaction: "GET /",
  };

  expect(shouldDropServerEvent(postRootEvent)).toBeTruthy();
  expect(shouldDropServerEvent(uptimeEvent)).toBeTruthy();
});

test("keeps real stackful server errors", () => {
  const event = {
    exception: {
      values: [
        {
          stacktrace: {
            frames: [{ filename: "/app/routes/dashboard.tsx", function: "loader" }],
          },
          type: "Error",
          value: "Unexpected Server Error",
        },
      ],
    },
    transaction: "GET /",
  };

  expect(shouldDropServerEvent(event)).toBeFalsy();
});
