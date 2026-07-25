/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { classifyMonitorDetailReadError, loadMonitorDetail } from '../api/monitor-api';
import type { MonitorDetail } from '../model/monitor-contract';
import {
  monitorDetailRefreshChoices,
  parseMonitorDetailRefresh,
  parseMonitorRouteId,
  type MonitorDetailEvidence,
  type MonitorDetailRefreshChoice
} from '../model/monitor-detail-model';
import { buildMonitorRoutePath, safeMonitorReturnTo } from '../model/monitor-model';
import { monitorQueryKeys } from './monitor-query-keys';

export function useMonitorDetailController() {
  const navigate = useNavigate();
  const { monitorId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const id = parseMonitorRouteId(monitorId);
  const returnTo = safeMonitorReturnTo(searchParams.get('returnTo'));
  const refreshSeconds = parseMonitorDetailRefresh(searchParams.get('refresh'));
  const query = useQuery({
    queryKey: monitorQueryKeys.detail(id),
    queryFn: id === undefined ? skipToken : ({ signal }) => loadMonitorDetail(id, signal),
    retry: false
  });
  return {
    state: { detail: resolveMonitorDetail(id, query.isPending, query.error, query.data), returnTo, refreshSeconds },
    actions: {
      back: () => {
        void navigate(returnTo);
      },
      edit: () => {
        if (id !== undefined) void navigate(buildMonitorRoutePath(id, 'edit', returnTo));
      },
      setRefreshSeconds: (value: MonitorDetailRefreshChoice) => {
        if (!monitorDetailRefreshChoices.includes(value)) return;
        const next = new URLSearchParams(searchParams);
        next.set('refresh', String(value));
        setSearchParams(next);
      }
    }
  };
}

function resolveMonitorDetail(
  id: number | undefined,
  pending: boolean,
  error: Error | null,
  detail: MonitorDetail | undefined
): MonitorDetailEvidence {
  if (id === undefined) return { kind: 'missing' };
  if (pending) return { kind: 'loading' };
  if (error) return { kind: classifyMonitorDetailReadError(error) };
  if (!detail) return { kind: 'error' };
  return { kind: 'ready', detail };
}
