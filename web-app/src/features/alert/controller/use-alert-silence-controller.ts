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

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useStringQueryDraft } from '@/shared/query-context';

import { classifyAlertSilenceReadError, loadAlertSilences } from '../alert-silence-api';
import { alertSilenceDetailDraft, type AlertSilenceListEvidence } from '../alert-silence-page-model';
import {
  readAlertSilenceQuery,
  writeAlertSilenceQuery,
  type AlertSilenceDraft,
  type AlertSilencePage,
  type AlertSilenceQuery
} from '../alert-silence-model';
import { useAlertSilenceDetailController } from './use-alert-silence-detail-controller';
import { useAlertSilenceMutations } from './use-alert-silence-mutations';
import type { AlertSilenceProjectionFailure } from './use-alert-silence-operation-gate';

const listKey = (query: AlertSilenceQuery) => ['alert-silence-policies', query] as const;
const createdProjectionPageSize = 25;

export function useAlertSilenceController() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const query = readAlertSilenceQuery(params);
  const latestQuery = useRef(query);
  // A pending command can outlive route changes; its visible reread belongs to
  // the latest committed route query, never the render that started the write.
  useLayoutEffect(() => {
    latestQuery.current = query;
  }, [query]);
  const source = writeAlertSilenceQuery(query).toString();
  const { value: search, setValue: setSearch } = useStringQueryDraft(source, query.search);
  const { list, overflow } = useAlertSilenceList(query, setParams);
  const updateQuery = (patch: Partial<AlertSilenceQuery>) => setParams(writeAlertSilenceQuery({ ...query, ...patch }));
  const rereadList = () => {
    const committedQuery = latestQuery.current;
    return queryClient.fetchQuery({
      queryKey: listKey(committedQuery),
      queryFn: ({ signal }) => loadAlertSilences(committedQuery, signal),
      staleTime: 0
    });
  };
  const readCreatedProjection = (draft: AlertSilenceDraft) => {
    const projectionQuery = createdProjectionQuery(draft);
    return queryClient.fetchQuery({
      queryKey: listKey(projectionQuery),
      queryFn: ({ signal }) => loadAlertSilences(projectionQuery, signal),
      staleTime: 0
    });
  };
  const mutations = useAlertSilenceMutations(rereadList, readCreatedProjection);
  const detail = useAlertSilenceDetailController(mutations.isLocked);
  const draft = alertSilenceDetailDraft(detail.detail);
  return {
    state: {
      query,
      search,
      detail: detail.detail,
      busy: mutations.busy,
      refreshing: list.isFetching,
      list: resolveListEvidence(mutations.projectionFailure, list.isPending, list.error, list.data, overflow)
    },
    actions: {
      setSearch,
      submitSearch: () => updateQuery({ search: search.trim(), pageIndex: 0 }),
      changePage: (page: number, pageSize: number) => updateQuery({ pageIndex: page - 1, pageSize }),
      refresh: () =>
        rereadList()
          .then(mutations.clearProjectionFailure)
          .catch(() => undefined),
      create: detail.create,
      edit: detail.edit,
      cancel: detail.cancel,
      updateDraft: detail.updateDraft,
      replaceDraft: detail.replaceDraft,
      save: () => mutations.save(draft, detail.close),
      toggle: mutations.toggle,
      remove: mutations.remove
    }
  };
}

function createdProjectionQuery(draft: AlertSilenceDraft): AlertSilenceQuery {
  // POST returns no identity. A successful response commits the command; this
  // bounded search only checks that the list projection can expose its fields.
  return { search: draft.name.trim(), pageIndex: 0, pageSize: createdProjectionPageSize };
}

function useAlertSilenceList(query: AlertSilenceQuery, setParams: ReturnType<typeof useSearchParams>[1]) {
  const list = useQuery({
    queryKey: listKey(query),
    queryFn: ({ signal }) => loadAlertSilences(query, signal),
    retry: false
  });
  const overflow =
    list.data &&
    list.data.content.length === 0 &&
    list.data.totalElements > 0 &&
    query.pageIndex >= list.data.totalPages;
  const totalPages = list.data?.totalPages;
  useEffect(() => {
    if (!overflow || totalPages === undefined) return;
    setParams(
      writeAlertSilenceQuery({
        search: query.search,
        pageSize: query.pageSize,
        pageIndex: Math.max(0, totalPages - 1)
      }),
      { replace: true }
    );
  }, [overflow, query.pageSize, query.search, setParams, totalPages]);
  return { list, overflow: Boolean(overflow) };
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
  if (error) return { kind: classifyAlertSilenceReadError(error) === 'unavailable' ? 'unavailable' : 'error' };
  if (!page) return { kind: 'error' };
  if (page.content.length === 0 && page.totalElements === 0) return { kind: 'empty' };
  if (page.content.length === 0) return { kind: 'error' };
  return { kind: 'ready', records: page.content, total: page.totalElements };
}
