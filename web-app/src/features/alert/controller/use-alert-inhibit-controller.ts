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
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import {
  classifyAlertInhibitReadError, deleteAlertInhibit, loadAlertInhibit, loadAlertInhibits,
  saveAlertInhibit, updateAlertInhibitEnabled
} from '../alert-inhibit-api';
import {
  AlertInhibitContractError, alertInhibitDraftFromDetail, buildAlertInhibitPayload,
  buildAlertInhibitTogglePayload, createAlertInhibitDraft, readAlertInhibitQuery,
  validateAlertInhibitDraft, writeAlertInhibitQuery, type AlertInhibit, type AlertInhibitDraft,
  type AlertInhibitPage, type AlertInhibitQuery
} from '../alert-inhibit-model';

export type AlertInhibitFailure = 'missing' | 'unavailable' | 'error';
export type AlertInhibitListState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | { kind: 'ready'; records: AlertInhibit[]; total: number };
export type AlertInhibitDetailState =
  | { kind: 'idle' }
  | { kind: 'loading'; id: number }
  | { kind: AlertInhibitFailure; id: number };

const listKey = (query: AlertInhibitQuery) => ['alert-inhibit-policies', query] as const;

export function useAlertInhibitController() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const query = readAlertInhibitQuery(params);
  const source = writeAlertInhibitQuery(query).toString();
  const [searchState, setSearchState] = useState({ source, value: query.search });
  const queryChanged = searchState.source !== source;
  if (queryChanged) setSearchState({ source, value: query.search });
  const search = queryChanged ? query.search : searchState.value;
  const listQuery = useQuery({ queryKey: listKey(query), queryFn: () => loadAlertInhibits(query), retry: false });
  const updateQuery = (patch: Partial<AlertInhibitQuery>) => setParams(writeAlertInhibitQuery({ ...query, ...patch }));
  const rereadList = () => queryClient.fetchQuery({
    queryKey: listKey(query), queryFn: () => loadAlertInhibits(query), staleTime: 0
  });
  const transactions = useAlertInhibitTransactions(rereadList);
  return {
    state: {
      ...transactions.state, list: resolveListState(listQuery.isPending, listQuery.error, listQuery.data),
      query, refreshing: listQuery.isFetching, search
    },
    setSearch: (value: string) => setSearchState(current => ({ ...current, value })),
    submitSearch: () => updateQuery({ search: search.trim(), pageIndex: 0 }),
    changePage: (page: number, pageSize: number) => updateQuery({
      pageIndex: pageSize === query.pageSize ? page - 1 : 0, pageSize
    }),
    refresh: () => rereadList().then(() => undefined).catch(() => undefined),
    ...transactions.actions
  };
}

function useAlertInhibitTransactions(rereadList: () => Promise<AlertInhibitPage>) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<AlertInhibitDraft | null>(null);
  const [detail, setDetail] = useState<AlertInhibitDetailState>({ kind: 'idle' });
  const [editorFailure, setEditorFailure] = useState<AlertInhibitFailure>();
  const [command, setCommand] = useState<'idle' | 'saving' | 'operating'>('idle');
  const edit = async (id: number) => {
    setDetail({ kind: 'loading', id });
    try {
      const record = await loadAlertInhibit(id);
      requireExactId(record.id, id);
      setDraft(alertInhibitDraftFromDetail(record));
      setEditorFailure(undefined);
      setDetail({ kind: 'idle' });
    } catch (reason) {
      setDetail({ kind: classifyAlertInhibitReadError(reason), id });
    }
  };
  const submit = async () => {
    if (!draft || validateAlertInhibitDraft(draft).length > 0) {
      void message.warning(t('alertInhibits.validation'));
      return;
    }
    setCommand('saving');
    setEditorFailure(undefined);
    try {
      await saveAlertInhibit(draft);
      if (draft.id !== undefined) {
        const canonical = await loadAlertInhibit(draft.id);
        requireWritableConvergence(canonical, { ...buildAlertInhibitPayload(draft), id: draft.id });
      }
      await rereadList();
      setDraft(null);
      setDetail({ kind: 'idle' });
      void message.success(t('alertInhibits.saveSuccess'));
    } catch (reason) {
      setEditorFailure(classifyAlertInhibitReadError(reason));
      void message.error(t('alertInhibits.saveFailed'));
    } finally {
      setCommand('idle');
    }
  };
  const toggle = async (inhibit: AlertInhibit, enable: boolean) => {
    setCommand('operating');
    try {
      await updateAlertInhibitEnabled(inhibit, enable);
      const canonical = await loadAlertInhibit(inhibit.id);
      requireWritableConvergence(canonical, buildAlertInhibitTogglePayload(inhibit, enable));
      await rereadList();
      void message.success(t('alertInhibits.operationSuccess'));
    } catch {
      void message.error(t('alertInhibits.operationFailed'));
    } finally {
      setCommand('idle');
    }
  };
  const remove = async (id: number) => {
    setCommand('operating');
    try {
      await deleteAlertInhibit(id);
      await proveMissing(id);
      const canonical = await rereadList();
      if (canonical.content.some(record => record.id === id)) throw new AlertInhibitContractError('deleted id remains');
      void message.success(t('alertInhibits.operationSuccess'));
    } catch {
      void message.error(t('alertInhibits.operationFailed'));
    } finally {
      setCommand('idle');
    }
  };
  return {
    state: { command, detail, draft, editorFailure },
    actions: {
      create: () => { setDraft(createAlertInhibitDraft()); setDetail({ kind: 'idle' }); setEditorFailure(undefined); },
      edit,
      retryDetail: () => detail.kind === 'idle' ? Promise.resolve() : edit(detail.id),
      closeDraft: () => { if (command === 'idle') setDraft(null); },
      updateDraft: (patch: Partial<AlertInhibitDraft>) => setDraft(current => current ? { ...current, ...patch } : current),
      submit, toggle, remove
    }
  };
}

function resolveListState(pending: boolean, error: Error | null, page: AlertInhibitPage | undefined): AlertInhibitListState {
  if (pending) return { kind: 'loading' };
  if (error) return { kind: classifyAlertInhibitReadError(error) === 'unavailable' ? 'unavailable' : 'error' };
  if (!page) return { kind: 'error' };
  if (page.content.length === 0 && page.totalElements === 0) return { kind: 'empty' };
  return { kind: 'ready', records: page.content, total: page.totalElements };
}

function requireWritableConvergence(actual: AlertInhibit, expected: {
  id: number; name: string; sourceLabels: Record<string, string> | null;
  targetLabels: Record<string, string> | null; equalLabels: string[] | null; enable: boolean;
}) {
  if (actual.id !== expected.id || actual.name !== expected.name
    || !mapsEqual(actual.sourceLabels, expected.sourceLabels)
    || !mapsEqual(actual.targetLabels, expected.targetLabels)
    || !setsEqual(actual.equalLabels, expected.equalLabels)
    || actual.enable !== expected.enable) {
    throw new AlertInhibitContractError('canonical writable fields did not converge');
  }
}

function mapsEqual(actual: Record<string, string> | null, expected: Record<string, string> | null) {
  if (actual === null || expected === null) return actual === expected;
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  return actualKeys.length === expectedKeys.length
    && actualKeys.every((key, index) => key === expectedKeys[index] && actual[key] === expected[key]);
}

function setsEqual(actual: string[] | null, expected: string[] | null) {
  const left = [...(actual ?? [])].sort();
  const right = [...(expected ?? [])].sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function requireExactId(actual: number, expected: number) {
  if (actual !== expected) throw new AlertInhibitContractError('detail id does not match the command');
}

async function proveMissing(id: number) {
  try {
    await loadAlertInhibit(id);
  } catch (reason) {
    if (classifyAlertInhibitReadError(reason) === 'missing') return;
    throw reason;
  }
  throw new AlertInhibitContractError('deleted detail still exists');
}
