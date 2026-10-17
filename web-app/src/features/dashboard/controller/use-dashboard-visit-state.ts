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

import { useCallback, useEffect, useState } from 'react';
import {
  dashboardVisitKey,
  dashboardScopeValue,
  readDashboardVisit,
  writeDashboardVisit,
  type DashboardVisit,
  type DashboardVisitIdentity
} from '../model/dashboard-visit';

function read(key: string | undefined) {
  try {
    return readDashboardVisit(key ? globalThis.sessionStorage.getItem(key) : null, Date.now());
  } catch {
    return readDashboardVisit(null, Date.now());
  }
}
function write(key: string, value: DashboardVisit) {
  try {
    globalThis.sessionStorage.setItem(key, writeDashboardVisit(value));
  } catch {
    /* Keep the current visit usable when browser storage is unavailable. */
  }
}
export function useDashboardVisitState(identity: DashboardVisitIdentity | null | undefined) {
  const key = dashboardVisitKey(identity);
  const [state, setState] = useState(() => ({ key, value: read(key) }));
  if (state.key !== key) setState({ key, value: read(key) });
  const value = state.key === key ? state.value : read(key);
  const update = useCallback(
    (patch: Partial<DashboardVisit>) => {
      setState(current => ({ key, value: { ...(current.key === key ? current.value : read(key)), ...patch } }));
    },
    [key]
  );
  const refresh = useCallback(() => update({ end: Date.now() }), [update]);
  useEffect(() => {
    if (key && state.key === key) write(key, state.value);
  }, [key, state.key, state.value]);
  return {
    ...value,
    refresh,
    setService: (service: string) => update({ serviceName: dashboardScopeValue(service, 256) }),
    setEnvironment: (environment: string) => update({ environment: dashboardScopeValue(environment, 128) })
  };
}
