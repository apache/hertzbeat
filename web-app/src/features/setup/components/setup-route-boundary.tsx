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

import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { setupRouteDecision, type SetupRouteBoundaryState } from '../model/setup-route-gate';

type SetupPaths = { setup: string; login: string };

export function SetupRouteBoundary({
  controller,
  loading,
  paths,
  product,
  setup,
  unavailable
}: {
  controller: SetupRouteBoundaryState;
  loading: ReactNode;
  paths: SetupPaths;
  product: ReactNode;
  setup: ReactNode;
  unavailable: ReactNode | ((retry: () => void) => ReactNode);
}) {
  const location = useLocation();
  if (controller.state === 'loading') return loading;
  if (controller.state === 'unavailable') {
    return typeof unavailable === 'function' ? unavailable(controller.retry) : unavailable;
  }
  if (controller.completionNavigation) {
    if (location.pathname !== paths.setup) return product;
    const { loginPath, username } = controller.completionNavigation;
    return <Navigate replace to={loginPath} state={{ prefillUsername: username }} />;
  }
  const decision = setupRouteDecision(controller.status.phase, location.pathname, paths);
  if (decision.kind === 'redirect') return <Navigate replace to={decision.to} />;
  return decision.kind === 'setup' ? setup : product;
}
