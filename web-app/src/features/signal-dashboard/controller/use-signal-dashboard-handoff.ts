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

import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { readDashboardPanelHandoff, type IncomingDashboardPanel } from '../model/signal-dashboard-handoff';

export function useSignalDashboardHandoff(scope: string) {
  const location = useLocation();
  const navigate = useNavigate();
  const consumed = useRef<string>();
  const [state, setState] = useState<{ scope: string; incoming: IncomingDashboardPanel | undefined; invalid: boolean }>(
    { scope, incoming: undefined, invalid: false }
  );
  useEffect(() => {
    const value: unknown = location.state;
    if (!value || typeof value !== 'object' || !('dashboardPanelHandoff' in value) || consumed.current === location.key)
      return;
    consumed.current = location.key;
    const incoming = readDashboardPanelHandoff(value.dashboardPanelHandoff);
    setState({ scope, incoming, invalid: !incoming });
    void navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: null }
    );
  }, [location, navigate, scope]);
  return {
    incoming: state.scope === scope ? state.incoming : undefined,
    error: state.scope === scope && state.invalid ? 'invalidHandoff' : undefined,
    dismiss: () => setState({ scope, incoming: undefined, invalid: false })
  };
}
