/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { SetupPhase } from './setup-contract';

export type SetupRouteDecision =
  Readonly<{ kind: 'setup' }> | Readonly<{ kind: 'product' }> | Readonly<{ kind: 'redirect'; to: string }>;

export type SetupRouteBoundaryState =
  | Readonly<{ state: 'loading' }>
  | Readonly<{ state: 'unavailable'; retry: () => void }>
  | Readonly<{ state: 'ready'; status: Readonly<{ phase: SetupPhase }> }>;

export function setupRouteDecision(
  phase: SetupPhase,
  pathname: string,
  paths: { setup: string; login: string }
): SetupRouteDecision {
  const setupRoute = pathname === paths.setup;
  if (phase === 'complete') {
    return setupRoute ? { kind: 'redirect', to: paths.login } : { kind: 'product' };
  }
  return setupRoute ? { kind: 'setup' } : { kind: 'redirect', to: paths.setup };
}
