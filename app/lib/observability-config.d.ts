export function resolveAppRelease(...values: (null | string | undefined)[]): null | string;
export function resolveObservabilityEnvironment(
  explicitValue?: null | string,
  fallbackValue?: null | string,
): string;
export function shouldEnableSentry(options?: {
  dsn?: null | string;
  isLocalDevRuntime?: boolean;
  localOverride?: null | string;
}): boolean;
