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

import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { alertRoutePaths } from '@/shared/navigation/app-paths';
import { useCanonicalQuerySearch, useQueryDraft, zeroBasedPageChange } from '@/shared/query-context';
import { useAuthoritativePageSelection } from '@/shared/table-selection';

import {
  alertFailureKind,
  readAlertQuery,
  writeAlertQuery,
  type AlertPage,
  type AlertQuery,
  type AlertSeverity,
  type AlertStatusFilter,
  type AlertSummary
} from '../model/alert-model';
import type {
  AlertCenterState,
  AlertDraftField,
  AlertFilterDraft,
  AlertListState,
  AlertSummaryState
} from '../model/alert-center-view-model';
import { createAlertCenterActionCommands } from './alert-center-action-admission';
import { useAlertCapabilities } from './use-alert-capabilities';
import { useAlertCenterData } from './use-alert-center-data';
import { useAlertCenterOperationController } from './use-alert-center-operation-controller';
import { useAlertCenterPageCorrection } from './use-alert-center-page-correction';

export function useAlertCenterController() {
  const capabilities = useAlertCapabilities();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const locationSearch = params.toString();
  const query = readAlertQuery(params);
  const source = writeAlertQuery(query).toString();
  useCanonicalQuerySearch(locationSearch, source, setParams);
  const draft = useAlertFilterDraft(query, source);

  const data = useAlertCenterData(query);
  const { list: listQuery, summary: summaryQuery, refetchList, refetchSummary, refresh } = data;
  useAlertCenterPageCorrection(query, listQuery.data, setParams);
  const list = resolveListState(listQuery);
  const { selectedIds, selectIds } = useAuthoritativePageSelection(source, list);
  const operation = useAlertCenterOperationController(refetchList, refetchSummary);

  useEffect(() => {
    if (!capabilities.canSelect) selectIds([]);
  }, [capabilities.canSelect, selectIds]);

  const updateQuery = (patch: Partial<AlertQuery>) => {
    setParams(writeAlertQuery({ ...query, ...patch }));
  };
  const setDraft = (field: AlertDraftField, value: string) => {
    draft.setValue({ ...draft.value, [field]: value });
  };
  const submitFilters = () => submitAlertFilters(draft.value, updateQuery);
  const commands = createAlertCenterActionCommands(capabilities, operation, list, selectedIds, selectIds);

  const state: AlertCenterState = {
    capabilities,
    command: operation.command,
    draft: draft.value,
    list,
    query,
    refreshing: summaryQuery.isFetching || listQuery.isFetching,
    recovery: operation.recovery,
    selectedIds: capabilities.canSelect ? selectedIds : [],
    summary: resolveSummaryState(summaryQuery)
  };

  return {
    state,
    setDraft,
    submitFilters,
    changeStatus: (status: AlertStatusFilter) => updateQuery({ status, pageIndex: 0 }),
    changeSeverity: (severity: AlertSeverity) => updateQuery({ severity, pageIndex: 0 }),
    changePage: (page: number, pageSize: number) => updateQuery(zeroBasedPageChange(page, pageSize, query.pageSize)),
    retryList: refetchList,
    retrySummary: refetchSummary,
    ...commands,
    refresh,
    manageRules: () => void navigate(alertRoutePaths.rules)
  };
}

function submitAlertFilters(draft: AlertFilterDraft, updateQuery: (patch: Partial<AlertQuery>) => void) {
  updateQuery({
    search: draft.search.trim(),
    serviceName: draft.serviceName.trim(),
    serviceNamespace: draft.serviceNamespace.trim(),
    environment: draft.environment.trim(),
    pageIndex: 0
  });
}

function useAlertFilterDraft(query: AlertQuery, source: string) {
  const canonicalDraft = useMemo<AlertFilterDraft>(
    () => ({
      search: query.search,
      serviceName: query.serviceName,
      serviceNamespace: query.serviceNamespace,
      environment: query.environment
    }),
    [query.environment, query.search, query.serviceName, query.serviceNamespace]
  );
  return useQueryDraft(source, canonicalDraft);
}

function resolveListState(query: {
  data: AlertPage | undefined;
  error: Error | null;
  isError: boolean;
  isPending: boolean;
}): AlertListState {
  if (query.isPending) return { kind: 'loading' };
  if (query.isError) return { kind: alertFailureKind(query.error) };
  if (!query.data) return { kind: 'error' };
  if (query.data.totalElements === 0) return { kind: 'empty' };
  return { kind: 'ready', records: query.data.content, total: query.data.totalElements };
}

function resolveSummaryState(query: {
  data: AlertSummary | undefined;
  error: Error | null;
  isError: boolean;
  isPending: boolean;
}): AlertSummaryState {
  if (query.isPending) return { kind: 'loading' };
  if (query.isError) return { kind: alertFailureKind(query.error) };
  return query.data ? { kind: 'ready', summary: query.data } : { kind: 'error' };
}
