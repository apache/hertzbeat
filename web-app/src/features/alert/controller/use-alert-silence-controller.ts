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

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useStringQueryDraft } from '@/shared/query-context';

import { alertSilenceDetailDraft, type AlertSilenceListEvidence } from '../model/alert-silence-page-model';
import {
  readAlertSilenceQuery,
  readAlertSilenceManagementContext,
  alertSilenceFailureKind,
  writeAlertSilenceRoute,
  type AlertSilencePage,
  type AlertSilenceQuery
} from '../model/alert-silence-model';
import { useAlertSilenceDetailController } from './use-alert-silence-detail-controller';
import { useAlertSilenceMutations } from './use-alert-silence-mutations';
import { useAlertSilenceSelection } from './use-alert-silence-selection';
import type { AlertSilenceProjectionFailure } from './use-alert-silence-operation-gate';
import {
  fetchAlertSilenceVisibleProjection,
  useAlertSilenceVisibleProjection,
  type AlertSilenceVisibleProjection
} from './alert-silence-visible-projection';

export function useAlertSilenceController() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const query = readAlertSilenceQuery(params);
  const management = readAlertSilenceManagementContext(params);
  const latestProjection = useRef<AlertSilenceVisibleProjection>({ query, management });
  // A pending command can outlive route changes; its visible reread belongs to
  // the latest committed route query, never the render that started the write.
  useLayoutEffect(() => {
    latestProjection.current = { query, management };
  }, [management, query]);
  const source = writeAlertSilenceRoute(query, management).toString();
  const { value: search, setValue: setSearch } = useStringQueryDraft(source, query.search);
  const projection = useAlertSilenceVisibleProjection({ query, management });
  const overflow = useAlertSilencePageCorrection(query, management, projection.page, setParams);
  const updateQuery = (patch: Partial<AlertSilenceQuery>) =>
    setParams(writeAlertSilenceRoute({ ...query, ...patch }, management));
  const rereadList = () => fetchAlertSilenceVisibleProjection(queryClient, latestProjection.current);
  const mutations = useAlertSilenceMutations(rereadList);
  const detail = useAlertSilenceDetailController(mutations.isActive, mutations.isLocked);
  const draft = alertSilenceDetailDraft(detail.detail);
  const managementActions = createAlertSilenceManagementActions(management, query, setParams, navigate);
  const list = resolveControllerList(projection, mutations, overflow);
  const selection = useAlertSilenceSelection(query, list);
  const selectIds = (ids: number[]) => {
    if (!mutations.isLocked()) selection.selectIds(ids);
  };
  return {
    state: {
      query,
      search,
      detail: detail.detail,
      busy: mutations.busy,
      writeLocked: mutations.isLocked(),
      recovery: mutations.recovery,
      refreshing: projection.refreshing,
      list,
      selectedIds: selection.selectedIds,
      management: { context: management, missingCount: projection.missingCount }
    },
    actions: {
      setSearch,
      submitSearch: () => updateQuery({ search: search.trim(), pageIndex: 0 }),
      changePage: (page: number, pageSize: number) => updateQuery({ pageIndex: page - 1, pageSize }),
      refresh: () => refreshAlertSilences(mutations.recovery?.retryable === true, mutations.retry, rereadList),
      selectIds,
      create: detail.create,
      edit: detail.edit,
      cancel: detail.cancel,
      updateDraft: detail.updateDraft,
      replaceDraft: detail.replaceDraft,
      save: () => mutations.save(draft, detail.captureCloseCurrentSession()),
      toggle: mutations.toggle,
      remove: mutations.remove,
      removeMany: mutations.removeMany,
      ...managementActions
    }
  };
}

function resolveControllerList(
  projection: ReturnType<typeof useAlertSilenceVisibleProjection>,
  mutations: ReturnType<typeof useAlertSilenceMutations>,
  overflow: boolean
) {
  return resolveListEvidence(
    mutations.projectionFailure,
    projection.pending,
    projection.error,
    projection.page,
    overflow
  );
}

function createAlertSilenceManagementActions(
  management: ReturnType<typeof readAlertSilenceManagementContext>,
  query: AlertSilenceQuery,
  setParams: ReturnType<typeof useSearchParams>[1],
  navigate: ReturnType<typeof useNavigate>
) {
  const switchMode = (mode: 'matched' | 'all') => {
    if (management) setParams(writeAlertSilenceRoute({ ...query, pageIndex: 0 }, { ...management, mode }));
  };
  return {
    viewAllRules: () => switchMode('all'),
    viewMatchedRules: () => switchMode('matched'),
    returnToEntity: () => {
      if (management) void navigate(management.returnTo);
    }
  };
}

async function refreshAlertSilences(
  hasRecovery: boolean,
  retry: () => Promise<void>,
  reread: () => Promise<AlertSilencePage>
) {
  if (hasRecovery) return retry();
  try {
    await reread();
  } catch {
    // React Query keeps the visible list error; refresh must not hide it.
  }
}

function useAlertSilencePageCorrection(
  query: AlertSilenceQuery,
  management: ReturnType<typeof readAlertSilenceManagementContext>,
  page: AlertSilencePage | undefined,
  setParams: ReturnType<typeof useSearchParams>[1]
) {
  const overflow = page && page.content.length === 0 && page.totalElements > 0 && query.pageIndex >= page.totalPages;
  const totalPages = page?.totalPages;
  useEffect(() => {
    if (!overflow || totalPages === undefined) return;
    setParams(
      writeAlertSilenceRoute(
        { search: query.search, pageSize: query.pageSize, pageIndex: Math.max(0, totalPages - 1) },
        management
      ),
      { replace: true }
    );
  }, [management, overflow, query.pageSize, query.search, setParams, totalPages]);
  return Boolean(overflow);
}

function resolveListEvidence(
  projectionFailure: AlertSilenceProjectionFailure | null,
  pending: boolean,
  error: Error | null,
  page: AlertSilencePage | undefined,
  overflow: boolean
): AlertSilenceListEvidence {
  if (projectionFailure) return { kind: projectionFailure };
  if (pending || overflow) return { kind: 'loading' };
  if (error) return { kind: alertSilenceFailureKind(error) === 'unavailable' ? 'unavailable' : 'error' };
  if (!page) return { kind: 'error' };
  if (page.content.length === 0 && page.totalElements === 0) return { kind: 'empty' };
  if (page.content.length === 0) return { kind: 'error' };
  return { kind: 'ready', records: page.content, total: page.totalElements };
}
