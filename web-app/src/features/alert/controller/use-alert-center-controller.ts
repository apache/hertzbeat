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

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { alertRoutePaths } from '@/shared/navigation/app-paths';

import { loadAlertGroups, loadAlertSummary } from '../alert-api';
import {
  alertFailureKind,
  readAlertQuery,
  writeAlertQuery,
  type AlertPage,
  type AlertQuery,
  type AlertSeverity,
  type AlertStatusFilter,
  type AlertSummary
} from '../alert-model';
import type {
  AlertCenterState,
  AlertDraftField,
  AlertFilterDraft,
  AlertListState,
  AlertSummaryState
} from '../model/alert-center-view-model';
import { alertCenterQueryKeys } from './alert-center-query-keys';

export function useAlertCenterController() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const query = readAlertQuery(params);
  const source = writeAlertQuery(query).toString();
  const canonicalDraft = draftFromQuery(query);
  const [draftState, setDraftState] = useState({ source, value: canonicalDraft });
  const queryChanged = draftState.source !== source;
  const draft = queryChanged ? canonicalDraft : draftState.value;

  useEffect(() => {
    // The derived draft shows the URL immediately. Re-reading the canonical
    // source here prevents an abandoned draft from reviving after Browser Back.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftState(current => (current.source === source ? current : { source, value: draftFromSource(source) }));
  }, [source]);

  const summaryQuery = useQuery({
    queryKey: alertCenterQueryKeys.summary(),
    queryFn: loadAlertSummary
  });
  const listQuery = useQuery({
    queryKey: alertCenterQueryKeys.groups(query),
    queryFn: () => loadAlertGroups(query)
  });

  const updateQuery = (patch: Partial<AlertQuery>) => {
    setParams(writeAlertQuery({ ...query, ...patch }));
  };
  const setDraft = (field: AlertDraftField, value: string) => {
    setDraftState({ source, value: { ...draft, [field]: value } });
  };
  const submitFilters = () => {
    updateQuery({
      search: draft.search.trim(),
      serviceName: draft.serviceName.trim(),
      serviceNamespace: draft.serviceNamespace.trim(),
      environment: draft.environment.trim(),
      pageIndex: 0
    });
  };

  const state: AlertCenterState = {
    draft,
    list: resolveListState(listQuery),
    query,
    refreshing: summaryQuery.isFetching || listQuery.isFetching,
    summary: resolveSummaryState(summaryQuery)
  };

  return {
    state,
    setDraft,
    submitFilters,
    changeStatus: (status: AlertStatusFilter) => updateQuery({ status, pageIndex: 0 }),
    changeSeverity: (severity: AlertSeverity) => updateQuery({ severity, pageIndex: 0 }),
    changePage: (page: number, pageSize: number) =>
      updateQuery({
        pageIndex: pageSize === query.pageSize ? page - 1 : 0,
        pageSize
      }),
    retryList: () => listQuery.refetch(),
    retrySummary: () => summaryQuery.refetch(),
    refresh: () => Promise.all([summaryQuery.refetch(), listQuery.refetch()]),
    manageRules: () => void navigate(alertRoutePaths.rules)
  };
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

function draftFromQuery(query: AlertQuery): AlertFilterDraft {
  return {
    search: query.search,
    serviceName: query.serviceName,
    serviceNamespace: query.serviceNamespace,
    environment: query.environment
  };
}

function draftFromSource(source: string) {
  return draftFromQuery(readAlertQuery(new URLSearchParams(source)));
}
