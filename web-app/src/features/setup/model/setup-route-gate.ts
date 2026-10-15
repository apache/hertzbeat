/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { SetupPhase } from './setup-contract';

export type SetupRouteDecision =
  Readonly<{ kind: 'setup' }> | Readonly<{ kind: 'product' }> | Readonly<{ kind: 'redirect'; to: string }>;

export type SetupRouteBoundaryState =
  | Readonly<{ state: 'loading' }>
  | Readonly<{ state: 'unavailable'; retry: () => void }>
  | Readonly<{
      state: 'ready';
      status: Readonly<{ phase: SetupPhase }>;
      completionNavigation?: Readonly<{ loginPath: string; username: string }> | null;
    }>;

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
