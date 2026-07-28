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
import { useLayoutEffect, useRef } from 'react';
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
import { useAlertSilenceActionCapabilities } from './use-alert-silence-action-capabilities';
import { useAlertSilenceMutations } from './use-alert-silence-mutations';
import { useAlertSilencePageCorrection } from './use-alert-silence-page-correction';
import { useAlertSilenceRoleLossRetirement } from './use-alert-silence-role-loss-retirement';
import { useAlertSilenceSelection } from './use-alert-silence-selection';
import type { AlertSilenceProjectionFailure } from './use-alert-silence-operation-gate';
import {
  fetchAlertSilenceVisibleProjection,
  useAlertSilenceVisibleProjection,
  type AlertSilenceVisibleProjection
} from './alert-silence-visible-projection';
import { createAlertSilenceControllerActions } from './alert-silence-controller-actions';

export function useAlertSilenceController() {
  const capabilities = useAlertSilenceActionCapabilities();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const query = readAlertSilenceQuery(params);
  const management = readAlertSilenceManagementContext(params);
  const latestProjection = useLatestAlertSilenceProjection(query, management);
  const { value: search, setValue: setSearch } = useAlertSilenceSearchDraft(query, management);
  const projection = useAlertSilenceVisibleProjection({ query, management });
  const overflow = useAlertSilencePageCorrection(query, management, projection.page, setParams);
  const updateQuery = (patch: Partial<AlertSilenceQuery>) =>
    setParams(writeAlertSilenceRoute({ ...query, ...patch }, management));
  const rereadList = () => fetchAlertSilenceVisibleProjection(queryClient, latestProjection.current);
  const mutations = useAlertSilenceMutations(rereadList);
  const detail = useAlertSilenceDetailController(
    mutations.isActive,
    () => mutations.isLocked() || !capabilities.canWrite
  );
  const draft = alertSilenceDetailDraft(detail.detail);
  const managementActions = createAlertSilenceManagementActions(management, query, setParams, navigate);
  const list = resolveControllerList(projection, mutations, overflow);
  const selection = useAlertSilenceSelection(query, list);
  const selectSelectionIds = selection.selectIds;
  useAlertSilenceRoleLossRetirement(capabilities, detail.retire, selectSelectionIds);
  const selectIds = (ids: number[]) => {
    if (capabilities.canDelete && !mutations.isLocked()) selectSelectionIds(ids);
  };
  const canRetryRecovery = canRetryAlertSilenceRecovery(capabilities, mutations.recovery);
  const actions = createAlertSilenceControllerActions({
    capabilities,
    search,
    draft,
    detail,
    mutations,
    setSearch,
    updateQuery,
    refresh: () => refreshAlertSilences(mutations.recovery !== null, canRetryRecovery, mutations.retry, rereadList),
    selectIds,
    managementActions
  });
  return {
    state: {
      capabilities,
      query,
      search,
      detail: detail.detail,
      busy: mutations.busy,
      writeLocked: mutations.isLocked(),
      recovery: mutations.recovery,
      canRetryRecovery,
      refreshing: projection.refreshing,
      list,
      selectedIds: capabilities.canDelete ? selection.selectedIds : [],
      management: { context: management, missingCount: projection.missingCount }
    },
    actions
  };
}

function useAlertSilenceSearchDraft(query: AlertSilenceQuery, management: AlertSilenceVisibleProjection['management']) {
  return useStringQueryDraft(writeAlertSilenceRoute(query, management).toString(), query.search);
}

function useLatestAlertSilenceProjection(
  query: AlertSilenceQuery,
  management: AlertSilenceVisibleProjection['management']
) {
  const latest = useRef<AlertSilenceVisibleProjection>({ query, management });
  useLayoutEffect(() => {
    latest.current = { query, management };
  }, [management, query]);
  return latest;
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
  canRetryRecovery: boolean,
  retry: () => Promise<void>,
  reread: () => Promise<AlertSilencePage>
) {
  if (hasRecovery && canRetryRecovery) return retry();
  try {
    await reread();
  } catch {
    // React Query keeps the visible list error; refresh must not hide it.
  }
}

function canRetryAlertSilenceRecovery(
  capabilities: ReturnType<typeof useAlertSilenceActionCapabilities>,
  recovery: ReturnType<typeof useAlertSilenceMutations>['recovery']
) {
  if (!recovery?.retryable) return false;
  return recovery.kind === 'delete' ? capabilities.canDelete : capabilities.canWrite;
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
