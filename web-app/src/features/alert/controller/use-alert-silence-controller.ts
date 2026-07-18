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
import { App } from 'antd';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { useStringQueryDraft } from '@/shared/query-context';

import {
  classifyAlertSilenceReadError, loadAlertSilence, loadAlertSilences
} from '../alert-silence-api';
import {
  alertSilenceDetailDraft,
  type AlertSilenceDetailState,
  type AlertSilenceListEvidence
} from '../alert-silence-page-model';
import {
  AlertSilenceContractError, alertSilenceDraftFromDetail, createAlertSilenceDraft, readAlertSilenceQuery,
  writeAlertSilenceQuery, type AlertSilenceDraft, type AlertSilencePage, type AlertSilenceQuery
} from '../alert-silence-model';
import { useAlertSilenceMutations } from './use-alert-silence-mutations';

const listKey = (query: AlertSilenceQuery) => ['alert-silence-policies', query] as const;

export function useAlertSilenceController() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const query = readAlertSilenceQuery(params);
  const source = writeAlertSilenceQuery(query).toString();
  const { value: search, setValue: setSearch } = useStringQueryDraft(source, query.search);
  const [detail, setDetail] = useState<AlertSilenceDetailState>({ kind: 'idle' });
  const intent = useRef(0);
  const editRequest = useRef<AbortController | null>(null);
  const draft = alertSilenceDetailDraft(detail);
  const { list, overflow } = useAlertSilenceList(query, setParams);
  useEditAbortCleanup(intent, editRequest);
  const updateQuery = (patch: Partial<AlertSilenceQuery>) => setParams(writeAlertSilenceQuery({ ...query, ...patch }));
  const rereadList = () => queryClient.fetchQuery({
    queryKey: listKey(query), queryFn: ({ signal }) => loadAlertSilences(query, signal), staleTime: 0
  });
  const closeDetail = () => {
    intent.current += 1;
    setDetail({ kind: 'idle' });
  };
  const mutations = useAlertSilenceMutations(draft, rereadList, closeDetail);
  const edit = async (id: number) => {
    if (mutations.isLocked()) return;
    editRequest.current?.abort();
    const request = new AbortController();
    editRequest.current = request;
    const token = ++intent.current;
    // Loading owns no draft so evidence from another id cannot remain visible.
    setDetail({ kind: 'loading', id });
    try {
      const record = await loadAlertSilence(id, request.signal);
      if (record.id !== id) throw new AlertSilenceContractError('detail id does not match the command');
      if (intent.current === token) {
        setDetail({ kind: 'ready', source: 'detail', id, draft: alertSilenceDraftFromDetail(record) });
      }
    } catch (reason) {
      if (!request.signal.aborted && intent.current === token) {
        setDetail({ kind: classifyAlertSilenceReadError(reason), id });
        void message.error(t('alertSilences.loadFailed'));
      }
    } finally {
      if (editRequest.current === request) editRequest.current = null;
    }
  };
  return {
    state: { query, search, detail, busy: mutations.busy, refreshing: list.isFetching,
      list: resolveListEvidence(list.isPending, list.error, list.data, Boolean(overflow)) },
    actions: {
      setSearch,
      submitSearch: () => updateQuery({ search: search.trim(), pageIndex: 0 }),
      changePage: (page: number, pageSize: number) => updateQuery({ pageIndex: page - 1, pageSize }),
      refresh: () => rereadList().then(() => undefined).catch(() => undefined),
      create: () => {
        if (mutations.isLocked()) return;
        editRequest.current?.abort();
        intent.current += 1;
        setDetail({ kind: 'ready', source: 'create', draft: createAlertSilenceDraft() });
      },
      edit,
      cancel: () => {
        if (mutations.isLocked()) return;
        editRequest.current?.abort();
        closeDetail();
      },
      updateDraft: (patch: Partial<AlertSilenceDraft>) => {
        if (mutations.isLocked()) return;
        setDetail(current => current.kind === 'ready'
          ? { ...current, draft: { ...current.draft, ...patch } }
          : current);
      },
      replaceDraft: (replacement: AlertSilenceDraft) => {
        if (mutations.isLocked()) return;
        setDetail(current => current.kind === 'ready' ? { ...current, draft: replacement } : current);
      },
      save: mutations.save, toggle: mutations.toggle, remove: mutations.remove
    }
  };
}

function useAlertSilenceList(query: AlertSilenceQuery, setParams: ReturnType<typeof useSearchParams>[1]) {
  const list = useQuery({
    queryKey: listKey(query), queryFn: ({ signal }) => loadAlertSilences(query, signal), retry: false
  });
  const overflow = list.data && list.data.content.length === 0 && list.data.totalElements > 0
    && query.pageIndex >= list.data.totalPages;
  const totalPages = list.data?.totalPages;
  useEffect(() => {
    if (!overflow || totalPages === undefined) return;
    setParams(writeAlertSilenceQuery({ search: query.search, pageSize: query.pageSize,
      pageIndex: Math.max(0, totalPages - 1) }), { replace: true });
  }, [overflow, query.pageSize, query.search, setParams, totalPages]);
  return { list, overflow: Boolean(overflow) };
}

function useEditAbortCleanup(intent: RefObject<number>, editRequest: RefObject<AbortController | null>) {
  useEffect(() => () => {
    intent.current += 1;
    editRequest.current?.abort();
  }, [editRequest, intent]);
}

function resolveListEvidence(pending: boolean, error: Error | null, page: AlertSilencePage | undefined,
  overflow: boolean): AlertSilenceListEvidence {
  if (pending || overflow) return { kind: 'loading' };
  if (error) return { kind: classifyAlertSilenceReadError(error) === 'unavailable' ? 'unavailable' : 'error' };
  if (!page) return { kind: 'error' };
  if (page.content.length === 0 && page.totalElements === 0) return { kind: 'empty' };
  if (page.content.length === 0) return { kind: 'error' };
  return { kind: 'ready', records: page.content, total: page.totalElements };
}
