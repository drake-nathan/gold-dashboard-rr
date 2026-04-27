import { PassThrough } from "node:stream";

import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import { type RenderToPipeableStreamOptions, renderToPipeableStream } from "react-dom/server";
import { type AppLoadContext, type EntryContext, ServerRouter } from "react-router";

import { shouldDropServerError } from "@/lib/posthog-event-filters";
import { getPostHogServer } from "@/lib/posthog-server";

export const handleError = (
  error: unknown,
  { request }: { request: Request },
): undefined | void => {
  if (request.signal.aborted) {
    return;
  }

  const status = error instanceof Response ? error.status : undefined;
  if (shouldDropServerError({ error, request, status })) {
    return;
  }

  const posthog = getPostHogServer();
  if (!posthog) {
    return;
  }

  const captured = error instanceof Error ? error : new Error(String(error));
  posthog.captureException(captured, undefined, {
    $current_url: request.url,
    method: request.method,
  });
};

export const streamTimeout = 5000;

const handleRequest = async (
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: AppLoadContext,
) => {
  // https://httpwg.org/specs/rfc9110.html#HEAD
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, {
      headers: responseHeaders,
      status: responseStatusCode,
    });
  }

  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const userAgent = request.headers.get("user-agent");

    // Ensure requests from bots and SPA Mode renders wait for all content to load before responding
    // https://react.dev/reference/react-dom/server/renderToPipeableStream#waiting-for-all-content-to-load-for-crawlers-and-static-generation
    const readyOption: keyof RenderToPipeableStreamOptions =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode ? "onAllReady" : "onShellReady";

    // Abort the rendering stream after the `streamTimeout` so it has time to
    // flush down the rejected boundaries
    let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
      abort();
    }, streamTimeout + 1000);

    const { abort, pipe } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        onError: (error: unknown) => {
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        },
        onShellError: (error: unknown) => {
          reject(error instanceof Error ? error : new Error(String(error)));
        },
        [readyOption]: () => {
          shellRendered = true;
          const body = new PassThrough({
            final: (callback) => {
              // Clear the timeout to prevent retaining the closure and memory leak
              clearTimeout(timeoutId);
              timeoutId = undefined;
              callback();
            },
          });
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");

          pipe(body);

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
        },
      },
    );
  });
};

export default handleRequest;
