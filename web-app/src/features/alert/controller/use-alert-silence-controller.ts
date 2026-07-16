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

import {
  classifyAlertSilenceReadError, deleteAlertSilence, loadAlertSilence, loadAlertSilences,
  saveAlertSilence, updateAlertSilenceEnabled
} from '../alert-silence-api';
import type { AlertSilenceListEvidence } from '../alert-silence-list-model';
import {
  alertSilenceDraftFromDetail, buildAlertSilencePayload, createAlertSilenceDraft, readAlertSilenceQuery,
  validateAlertSilenceDraft, writeAlertSilenceQuery, type AlertSilence, type AlertSilenceDraft,
  type AlertSilencePage, type AlertSilenceQuery
} from '../alert-silence-model';

const listKey = (query: AlertSilenceQuery) => ['alert-silence-policies', query] as const;

export function useAlertSilenceController() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const query = readAlertSilenceQuery(params);
  const source = writeAlertSilenceQuery(query).toString();
  const [searchState, setSearchState] = useState({ source, value: query.search });
  const [draft, setDraft] = useState<AlertSilenceDraft | null>(null);
  const intent = useRef(0);
  const editRequest = useRef<AbortController | null>(null);
  const search = searchState.source === source ? searchState.value : query.search;
  const { list, overflow } = useAlertSilenceList(query, setParams);
  useEditAbortCleanup(intent, editRequest);
  const updateQuery = (patch: Partial<AlertSilenceQuery>) => setParams(writeAlertSilenceQuery({ ...query, ...patch }));
  const rereadList = () => queryClient.fetchQuery({
    queryKey: listKey(query), queryFn: ({ signal }) => loadAlertSilences(query, signal), staleTime: 0
  });
  const mutations = useAlertSilenceMutations(draft, setDraft, intent, rereadList);
  const edit = async (id: number) => {
    if (mutations.isLocked()) return;
    editRequest.current?.abort();
    const request = new AbortController();
    editRequest.current = request;
    const token = ++intent.current;
    try {
      const detail = await loadAlertSilence(id, request.signal);
      if (intent.current === token) setDraft(alertSilenceDraftFromDetail(detail));
    } catch {
      if (!request.signal.aborted && intent.current === token) void message.error(t('alertSilences.loadFailed'));
    }
  };
  return {
    state: { query, search, draft, busy: mutations.busy, refreshing: list.isFetching,
      list: resolveListEvidence(list.isPending, list.error, list.data, Boolean(overflow)) },
    actions: {
      setSearch: (value: string) => setSearchState({ source, value }),
      submitSearch: () => updateQuery({ search: search.trim(), pageIndex: 0 }),
      changePage: (page: number, pageSize: number) => updateQuery({ pageIndex: page - 1, pageSize }),
      refresh: () => rereadList().then(() => undefined).catch(() => undefined),
      create: () => {
        if (mutations.isLocked()) return;
        editRequest.current?.abort();
        intent.current += 1;
        setDraft(createAlertSilenceDraft());
      },
      edit,
      cancel: () => {
        if (mutations.isLocked()) return;
        editRequest.current?.abort();
        intent.current += 1;
        setDraft(null);
      },
      updateDraft: (patch: Partial<AlertSilenceDraft>) => {
        if (mutations.isLocked()) return;
        setDraft(current => current ? { ...current, ...patch } : current);
      },
      replaceDraft: (replacement: AlertSilenceDraft) => {
        if (mutations.isLocked()) return;
        setDraft(replacement);
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

function useAlertSilenceMutations(draft: AlertSilenceDraft | null,
  setDraft: (draft: AlertSilenceDraft | null) => void, intentRef: RefObject<number>,
  rereadList: () => Promise<AlertSilencePage>) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const operate = async (operation: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      await operation();
      void message.success(t('alertSilences.operationSuccess'));
    } catch {
      void message.error(t('alertSilences.operationFailed'));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const save = async () => {
    if (locked.current) return;
    const current = draft;
    if (!current || validateAlertSilenceDraft(current).length > 0) {
      void message.warning(t('alertSilences.validation'));
      return;
    }
    locked.current = true;
    setBusy(true);
    try {
      await saveAlertSilence(current);
      if (current.id) requireDraftConvergence(await loadAlertSilence(current.id), current);
      await rereadList();
      setDraft(null);
      intentRef.current += 1;
      void message.success(t('alertSilences.saveSuccess'));
    } catch {
      void message.error(t('alertSilences.saveFailed'));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const toggle = (silence: AlertSilence, enabled: boolean) => operate(async () => {
    await updateAlertSilenceEnabled(silence, enabled);
    requireSilenceConvergence(await loadAlertSilence(silence.id), { ...silence, enable: enabled });
    await rereadList();
  });
  const remove = (id: number) => operate(async () => {
    await deleteAlertSilence(id);
    try {
      await loadAlertSilence(id);
    } catch (reason) {
      if (classifyAlertSilenceReadError(reason) === 'missing') {
        await rereadList();
        return;
      }
      throw reason;
    }
    throw new Error('Deleted silence still exists');
  });
  return { busy, isLocked: () => locked.current, save, toggle, remove };
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

function requireDraftConvergence(actual: AlertSilence, draft: AlertSilenceDraft) {
  const payload = buildAlertSilencePayload(draft);
  requireSilenceConvergence(actual, { ...actual, ...payload, id: draft.id! });
}

function requireSilenceConvergence(actual: AlertSilence, expected: AlertSilence) {
  if (actual.id !== expected.id || actual.name !== expected.name || actual.enable !== expected.enable
    || actual.matchAll !== expected.matchAll || actual.type !== expected.type
    || !mapsEqual(actual.labels, expected.labels) || !arraysEqual(actual.days, expected.days)
    || !timesEqual(actual.periodStart, expected.periodStart) || !timesEqual(actual.periodEnd, expected.periodEnd)) {
    throw new Error('Alert Silence canonical fields did not converge');
  }
}

function mapsEqual(left: Record<string, string> | null, right: Record<string, string> | null) {
  if (left === null || right === null) return left === right;
  const keys = Object.keys(left).sort();
  return keys.length === Object.keys(right).length && keys.every(key => left[key] === right[key]);
}

function arraysEqual(left: number[] | null, right: number[] | null) {
  if (left === null || right === null) return left === right;
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function timesEqual(left: string | null, right: string | null) {
  if (left === null || right === null) return left === right;
  return Date.parse(left) === Date.parse(right);
}
