interface PostHogException {
  mechanism?: {
    handled?: boolean;
    type?: string;
  };
  stacktrace?: {
    frames?: {
      filename?: string;
      function?: string;
      module?: string;
    }[];
  };
  type?: string;
  value?: string;
}

interface PostHogEventLike {
  event?: string;
  properties?: {
    $browser?: string;
    $exception_list?: PostHogException[];
    $exception_message?: string;
    $exception_type?: string;
    [key: string]: unknown;
  };
}

interface ServerErrorContext {
  error: unknown;
  request?: { headers?: Headers; method?: string; url?: string };
  status?: number;
}

export function shouldDropClientEvent(event: PostHogEventLike): boolean;
export function shouldDropServerError(input: ServerErrorContext): boolean;
