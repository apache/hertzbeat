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
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ApiMessageError } from '@/core/http/api-message';

import { loadAlertGroups, loadAlertSummary } from '../alert-api';
import {
  AlertContractError,
  readAlertQuery,
  writeAlertQuery,
  type AlertGroup,
  type AlertPage,
  type AlertQuery,
  type AlertSeverity,
  type AlertStatusFilter,
  type AlertSummary
} from '../alert-model';

type AlertFilterDraft = Pick<AlertQuery, 'search' | 'serviceName' | 'serviceNamespace' | 'environment'>;
type DraftField = keyof AlertFilterDraft;

export type AlertListState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'ready'; records: AlertGroup[]; total: number }
  | { kind: 'unavailable' }
  | { kind: 'error' };

export type AlertSummaryState =
  | { kind: 'loading' }
  | { kind: 'ready'; summary: AlertSummary }
  | { kind: 'unavailable' }
  | { kind: 'error' };

type AlertCenterState = {
  draft: AlertFilterDraft;
  list: AlertListState;
  query: AlertQuery;
  refreshing: boolean;
  summary: AlertSummaryState;
};

export function useAlertCenterController() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const query = readAlertQuery(params);
  const queryDraft = draftFromQuery(query);
  const source = writeAlertQuery(query).toString();
  const [draftState, setDraftState] = useState({ source, value: queryDraft });
  const queryChanged = draftState.source !== source;
  if (queryChanged) setDraftState({ source, value: queryDraft });
  const draft = queryChanged ? queryDraft : draftState.value;

  const summaryQuery = useQuery({
    queryKey: ['alert-summary'],
    queryFn: loadAlertSummary
  });
  const listQuery = useQuery({
    queryKey: ['alert-groups', query],
    queryFn: () => loadAlertGroups(query)
  });

  const updateQuery = (patch: Partial<AlertQuery>) => {
    setParams(writeAlertQuery({ ...query, ...patch }));
  };
  const setDraft = (field: DraftField, value: string) => {
    setDraftState(current => ({ ...current, value: { ...draft, [field]: value } }));
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
    changePage: (page: number, pageSize: number) => updateQuery({
      pageIndex: pageSize === query.pageSize ? page - 1 : 0,
      pageSize
    }),
    retryList: () => listQuery.refetch(),
    retrySummary: () => summaryQuery.refetch(),
    refresh: () => Promise.all([summaryQuery.refetch(), listQuery.refetch()]),
    manageRules: () => navigate('/alerts/rules')
  };
}

function resolveListState(query: {
  data: AlertPage | undefined;
  error: Error | null;
  isError: boolean;
  isPending: boolean;
}): AlertListState {
  if (query.isPending) return { kind: 'loading' };
  if (query.isError) return { kind: failureKind(query.error) };
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
  if (query.isError) return { kind: failureKind(query.error) };
  return query.data ? { kind: 'ready', summary: query.data } : { kind: 'error' };
}

function failureKind(error: Error | null): 'unavailable' | 'error' {
  if (error instanceof AlertContractError) return 'error';
  if (error instanceof ApiMessageError) {
    if (error.cause !== undefined || error.status === undefined || [0, 502, 503, 504].includes(error.status)) {
      return 'unavailable';
    }
  }
  return 'error';
}

function draftFromQuery(query: AlertQuery): AlertFilterDraft {
  return {
    search: query.search,
    serviceName: query.serviceName,
    serviceNamespace: query.serviceNamespace,
    environment: query.environment
  };
}
