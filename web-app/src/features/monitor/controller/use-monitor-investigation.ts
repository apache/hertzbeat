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

import { skipToken, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { normalizeInvestigationTimeZone, type SignalKind } from '@/shared/query-context';
import { classifyMonitorReadError, loadMonitorInvestigation } from '../api/monitor-api';
import type { Monitor } from '../model/monitor-contract';
import type { MonitorMetricHistory } from '../model/monitor-detail-model';
import {
  buildMonitorInvestigationSignalPath,
  createMonitorInvestigation,
  monitorInvestigationWindow,
  type MonitorInvestigationViewState
} from '../model/monitor-investigation-model';
import { monitorQueryKeys } from './monitor-query-keys';

export function useMonitorInvestigation(monitor: Monitor | undefined, history: MonitorMetricHistory) {
  const navigate = useNavigate();
  const window = useFrozenInvestigationWindow(monitor?.id, history);
  const exactWindow = window ? { from: window.from, to: window.to } : undefined;
  const query = useQuery({
    queryKey: monitorQueryKeys.investigation(monitor?.id, exactWindow),
    queryFn:
      monitor && exactWindow ? ({ signal }) => loadMonitorInvestigation(monitor.id, exactWindow, signal) : skipToken,
    retry: false,
    staleTime: 30_000
  });
  const state = investigationState(monitor, window, query);
  const binding =
    state.kind === 'ready' && state.snapshot.binding.state === 'ready' ? state.snapshot.binding.identity : undefined;
  return {
    state,
    signals: binding ? [...binding.signals] : [],
    open: (signal: SignalKind) => {
      if (!monitor || !binding || !window || !binding.signals.includes(signal)) return;
      try {
        const investigation = createMonitorInvestigation(monitor, binding, window);
        const path = buildMonitorInvestigationSignalPath(investigation, signal);
        if (path) void navigate(path);
      } catch {
        // Invalid local time or stale identity must not create a partial handoff.
      }
    },
    refetch: () => (monitor ? query.refetch() : Promise.resolve())
  };
}

function useFrozenInvestigationWindow(monitorId: number | undefined, history: MonitorMetricHistory) {
  const [timeZone] = useState(browserTimeZone);
  const [to] = useState(Date.now);
  if (!monitorId) return undefined;
  try {
    return monitorInvestigationWindow(history, to, timeZone);
  } catch {
    return undefined;
  }
}

function investigationState(
  monitor: Monitor | undefined,
  window: ReturnType<typeof monitorInvestigationWindow> | undefined,
  query: {
    data?: Awaited<ReturnType<typeof loadMonitorInvestigation>> | undefined;
    error: Error | null;
    isPending: boolean;
  }
): MonitorInvestigationViewState {
  if (!monitor) return { kind: 'inactive' };
  if (!window) return { kind: 'invalid_window' };
  if (query.error) return { kind: classifyMonitorReadError(query.error), window };
  if (query.data) return { kind: 'ready', window, snapshot: query.data };
  return { kind: 'loading', window };
}

function browserTimeZone() {
  return normalizeInvestigationTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone) ?? 'UTC';
}
