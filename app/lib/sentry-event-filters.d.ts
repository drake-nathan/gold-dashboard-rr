interface SentryEventLike {
  exception?: {
    values?: {
      mechanism?: {
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
    }[];
  };
  extra?: {
    __serialized?: unknown;
  };
  request?: {
    headers?: Record<string, string | string[] | undefined>;
    method?: string;
    url?: string;
  };
  tags?: Record<string, unknown>;
  transaction?: string;
}

export function shouldDropClientEvent(event: SentryEventLike): boolean;
export function shouldDropServerEvent(event: SentryEventLike): boolean;
