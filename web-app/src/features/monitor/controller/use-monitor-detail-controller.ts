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

import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { classifyMonitorDetailReadError, deleteMonitorGrafanaDashboard, loadMonitorDetail } from '../api/monitor-api';
import type { MonitorDetail } from '../model/monitor-contract';
import {
  monitorDetailRefreshInterval,
  monitorDetailRefreshChoices,
  parseMonitorDetailRefresh,
  parseMonitorRouteId,
  type MonitorDetailEvidence,
  type MonitorDetailRefreshChoice
} from '../model/monitor-detail-model';
import { buildMonitorRoutePath, safeMonitorReturnTo } from '../model/monitor-model';
import { useMonitorCapabilities } from './use-monitor-capabilities';
import { monitorQueryKeys } from './monitor-query-keys';

type DeleteOwner = { id: number; epoch: number; controller: AbortController };

export function useMonitorDetailController() {
  const capabilities = useMonitorCapabilities();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { monitorId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const id = parseMonitorRouteId(monitorId);
  const returnTo = safeMonitorReturnTo(searchParams.get('returnTo'));
  const refreshSeconds = parseMonitorDetailRefresh(searchParams.get('refresh'));
  const dashboardDelete = useGrafanaDashboardDelete(id, queryClient, capabilities.canDeleteGrafanaDashboard);
  const query = useQuery({
    queryKey: monitorQueryKeys.detail(id),
    queryFn: id === undefined ? skipToken : ({ signal }) => loadMonitorDetail(id, signal),
    refetchInterval: id === undefined ? false : monitorDetailRefreshInterval(refreshSeconds),
    retry: false
  });
  return {
    state: {
      detail: resolveMonitorDetail(id, query.isPending, query.error, query.data),
      returnTo,
      refreshSeconds,
      canEdit: capabilities.canWrite,
      canDeleteGrafanaDashboard: capabilities.canDeleteGrafanaDashboard,
      grafanaDeleting: dashboardDelete.deleting,
      grafanaDeleteError: dashboardDelete.error
    },
    actions: {
      back: () => {
        void navigate(returnTo);
      },
      edit: () => {
        if (capabilities.canWrite && id !== undefined) void navigate(buildMonitorRoutePath(id, 'edit', returnTo));
      },
      refresh: () => {
        if (id !== undefined) void query.refetch();
      },
      deleteGrafanaDashboard: dashboardDelete.run,
      setRefreshSeconds: (value: MonitorDetailRefreshChoice) => {
        if (!monitorDetailRefreshChoices.includes(value)) return;
        const next = new URLSearchParams(searchParams);
        next.set('refresh', String(value));
        setSearchParams(next);
      }
    }
  };
}

function useGrafanaDashboardDelete(
  id: number | undefined,
  queryClient: ReturnType<typeof useQueryClient>,
  canDeleteGrafanaDashboard: boolean
) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);
  const ownership = useGrafanaDeleteOwnership(id, canDeleteGrafanaDashboard, setDeleting, setError);
  const run = async () => {
    const owner = ownership.begin();
    if (!owner) return;
    setDeleting(true);
    setError(false);
    try {
      await deleteMonitorGrafanaDashboard(owner.id, owner.controller.signal);
      if (!ownership.owns(owner)) return;
      queryClient.setQueryData<MonitorDetail>(monitorQueryKeys.detail(owner.id), detail => {
        if (!ownership.owns(owner)) return detail;
        return detail?.grafanaDashboard
          ? { ...detail, grafanaDashboard: { ...detail.grafanaDashboard, enabled: false, url: null } }
          : detail;
      });
    } catch {
      if (ownership.owns(owner) && !owner.controller.signal.aborted) setError(true);
    } finally {
      if (ownership.finish(owner)) setDeleting(false);
    }
  };
  return { deleting, error, run };
}

function useGrafanaDeleteOwnership(
  id: number | undefined,
  canDelete: boolean,
  setDeleting: (deleting: boolean) => void,
  setError: (error: boolean) => void
) {
  const operation = useRef<DeleteOwner | null>(null);
  const epoch = useRef(0);
  const currentId = useRef(id);
  const currentCanDelete = useRef(canDelete);
  const owns = (owner: DeleteOwner) =>
    operation.current === owner &&
    epoch.current === owner.epoch &&
    currentId.current === owner.id &&
    currentCanDelete.current;
  const begin = () => {
    const operationId = currentId.current;
    if (!currentCanDelete.current || operationId === undefined || operation.current) return null;
    const owner = { id: operationId, epoch: epoch.current + 1, controller: new AbortController() };
    epoch.current = owner.epoch;
    operation.current = owner;
    return owner;
  };
  const finish = (owner: DeleteOwner) => {
    if (!owns(owner)) return false;
    operation.current = null;
    epoch.current += 1;
    return true;
  };
  // Retire ownership before abort so a transport that ignores cancellation cannot publish into a new route or role.
  const retire = useCallback(
    (owner: DeleteOwner) => {
      if (operation.current !== owner) return;
      operation.current = null;
      epoch.current += 1;
      setDeleting(false);
      setError(false);
      owner.controller.abort();
    },
    [setDeleting, setError]
  );
  useLayoutEffect(() => {
    currentId.current = id;
    currentCanDelete.current = canDelete;
    const owner = operation.current;
    if (owner && (!canDelete || owner.id !== id)) retire(owner);
  }, [canDelete, id, retire]);
  useLayoutEffect(
    () => () => {
      const owner = operation.current;
      if (!owner) return;
      operation.current = null;
      epoch.current += 1;
      owner.controller.abort();
    },
    []
  );
  return { begin, finish, owns };
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
