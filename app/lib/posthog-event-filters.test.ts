import { expect, test } from "vitest";

import {
  getServerExceptionDistinctId,
  normalizeServerException,
  shouldDropClientEvent,
  shouldDropServerError,
} from "./posthog-event-filters";

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

  expect(
    shouldDropServerError({
      error: {
        data: 'No route matches URL "/wp-admin/install.php?step=1"',
        status: 404,
        statusText: "Not Found",
      },
      request: {
        headers: new Headers(),
        method: "GET",
        url: "https://dashboard.gold/wp-admin/install.php?step=1",
      },
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

test("drops scanner paths before server-side exception capture", () => {
  expect(
    shouldDropServerError({
      error: new Error("Unexpected Server Error"),
      request: {
        headers: new Headers(),
        method: "GET",
        url: "https://dashboard.gold/.env.production",
      },
    }),
  ).toBeTruthy();

  expect(
    shouldDropServerError({
      error: new Error("Unexpected Server Error"),
      request: {
        headers: new Headers(),
        method: "GET",
        url: "https://dashboard.gold/wp-content/plugins/hellopress/wp_filemanager.php",
      },
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

test("normalizes object-shaped route errors for server exception capture", () => {
  const normalized = normalizeServerException(
    {
      data: { message: "Product not found", productId: "abc123" },
      status: 500,
      statusText: "Internal Server Error",
    },
    {
      headers: new Headers(),
      method: "GET",
      url: "https://dashboard.gold/products/abc123",
    },
  );

  expect(normalized.error.message).toBe("Route error 500 Internal Server Error: Product not found");
  expect(normalized.properties).toMatchObject({
    error_data_type: "object",
    original_error_type: "Object",
    request_path: "/products/abc123",
    status: 500,
    status_text: "Internal Server Error",
  });
  expect(String(normalized.properties.error_data)).toContain("abc123");
});

test("keeps existing Error instances while adding server exception context", () => {
  const error = new Error("Database query failed");
  const normalized = normalizeServerException(error, {
    headers: new Headers(),
    method: "GET",
    url: "https://dashboard.gold/alerts?metal=gold",
  });

  expect(normalized.error).toBe(error);
  expect(normalized.properties).toMatchObject({
    original_error_type: "Error",
    request_path: "/alerts?metal=gold",
  });
});

test("uses PostHog cookie distinct ID for server exception capture", () => {
  const cookieValue = encodeURIComponent(
    JSON.stringify({ $device_id: "device_456", distinct_id: "distinct_123" }),
  );

  expect(
    getServerExceptionDistinctId({
      headers: new Headers({ cookie: `ph_project_posthog=${cookieValue}` }),
    }),
  ).toBe("distinct_123");
});

test("falls back to a shared anonymous server distinct ID", () => {
  expect(getServerExceptionDistinctId({ headers: new Headers() })).toBe("server-anonymous");
});
