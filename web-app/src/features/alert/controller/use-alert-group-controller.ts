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

import type { RemotePageState } from '@/shared/remote-state';

import {
  classifyAlertGroupReadError,
  deleteAlertGroup,
  loadAlertGroup,
  loadAlertGroups,
  saveAlertGroup,
  updateAlertGroupEnabled
} from '../alert-group-api';
import {
  AlertGroupContractError,
  alertGroupDraftFromDetail,
  buildAlertGroupPayload,
  buildAlertGroupTogglePayload,
  createAlertGroupDraft,
  readAlertGroupQuery,
  validateAlertGroupDraft,
  writeAlertGroupQuery,
  type AlertGroupConverge,
  type AlertGroupDraft,
  type AlertGroupPage,
  type AlertGroupQuery
} from '../alert-group-model';

export type AlertGroupFailure = 'missing' | 'unavailable' | 'error';
export type AlertGroupListState = RemotePageState<AlertGroupConverge, 'unavailable' | 'error'>;
export type AlertGroupDetailState =
  | { kind: 'idle' }
  | { kind: 'loading'; id: number }
  | { kind: AlertGroupFailure; id: number };

const listKey = (query: AlertGroupQuery) => ['alert-group-policies', query] as const;

export function useAlertGroupController() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const query = readAlertGroupQuery(params);
  const source = writeAlertGroupQuery(query).toString();
  const [searchState, setSearchState] = useState({ source, value: query.search });
  const queryChanged = searchState.source !== source;
  if (queryChanged) setSearchState({ source, value: query.search });
  const search = queryChanged ? query.search : searchState.value;
  const listQuery = useQuery({
    queryKey: listKey(query),
    queryFn: () => loadAlertGroups(query),
    retry: false
  });

  const updateQuery = (patch: Partial<AlertGroupQuery>) => setParams(writeAlertGroupQuery({ ...query, ...patch }));
  const rereadList = () => queryClient.fetchQuery({
    queryKey: listKey(query),
    queryFn: () => loadAlertGroups(query),
    staleTime: 0
  });
  const transactions = useAlertGroupTransactions(rereadList);

  return {
    state: {
      ...transactions.state,
      list: resolveListState(listQuery.isPending, listQuery.error, listQuery.data),
      query,
      refreshing: listQuery.isFetching,
      search
    },
    setSearch: (value: string) => setSearchState(current => ({ ...current, value })),
    submitSearch: () => updateQuery({ search: search.trim(), pageIndex: 0 }),
    changePage: (page: number, pageSize: number) => updateQuery({
      pageIndex: pageSize === query.pageSize ? page - 1 : 0,
      pageSize
    }),
    refresh: () => rereadList().then(() => undefined).catch(() => undefined),
    ...transactions.actions
  };
}

function useAlertGroupTransactions(rereadList: () => Promise<AlertGroupPage>) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<AlertGroupDraft | null>(null);
  const [detail, setDetail] = useState<AlertGroupDetailState>({ kind: 'idle' });
  const [editorFailure, setEditorFailure] = useState<AlertGroupFailure>();
  const [command, setCommand] = useState<'idle' | 'saving' | 'operating'>('idle');
  const edit = async (id: number) => {
    setDetail({ kind: 'loading', id });
    try {
      const record = await loadAlertGroup(id);
      requireExactId(record.id, id);
      setDraft(alertGroupDraftFromDetail(record));
      setEditorFailure(undefined);
      setDetail({ kind: 'idle' });
    } catch (reason) {
      setDetail({ kind: classifyAlertGroupReadError(reason), id });
    }
  };
  const submit = async () => {
    if (!draft || validateAlertGroupDraft(draft).length > 0) {
      void message.warning(t('alertGroups.validation'));
      return;
    }
    setCommand('saving');
    setEditorFailure(undefined);
    try {
      await saveAlertGroup(draft);
      if (draft.id !== undefined) {
        const canonical = await loadAlertGroup(draft.id);
        requireWritableConvergence(canonical, { ...buildAlertGroupPayload(draft), id: draft.id });
      }
      await rereadList();
      setDraft(null);
      setDetail({ kind: 'idle' });
      void message.success(t('alertGroups.saveSuccess'));
    } catch (reason) {
      setEditorFailure(classifyAlertGroupReadError(reason));
      void message.error(t('alertGroups.saveFailed'));
    } finally {
      setCommand('idle');
    }
  };
  const toggle = async (group: AlertGroupConverge, enable: boolean) => {
    setCommand('operating');
    try {
      await updateAlertGroupEnabled(group, enable);
      const canonical = await loadAlertGroup(group.id);
      requireWritableConvergence(canonical, buildAlertGroupTogglePayload(group, enable));
      await rereadList();
      void message.success(t('alertGroups.operationSuccess'));
    } catch {
      void message.error(t('alertGroups.operationFailed'));
    } finally {
      setCommand('idle');
    }
  };
  const remove = async (id: number) => {
    setCommand('operating');
    try {
      await deleteAlertGroup(id);
      await proveMissing(id);
      const canonical = await rereadList();
      if (canonical.content.some(record => record.id === id)) throw new AlertGroupContractError('deleted id remains');
      void message.success(t('alertGroups.operationSuccess'));
    } catch {
      void message.error(t('alertGroups.operationFailed'));
    } finally {
      setCommand('idle');
    }
  };
  return {
    state: { command, detail, draft, editorFailure },
    actions: {
      create: () => {
        setDraft(createAlertGroupDraft());
        setDetail({ kind: 'idle' });
        setEditorFailure(undefined);
      },
      edit,
      retryDetail: () => detail.kind === 'idle' ? Promise.resolve() : edit(detail.id),
      closeDraft: () => { if (command === 'idle') setDraft(null); },
      updateDraft: (patch: Partial<AlertGroupDraft>) => setDraft(current => current ? { ...current, ...patch } : current),
      submit,
      toggle,
      remove
    }
  };
}

function resolveListState(pending: boolean, error: Error | null, page: AlertGroupPage | undefined): AlertGroupListState {
  if (pending) return { kind: 'loading' };
  if (error) {
    return { kind: classifyAlertGroupReadError(error) === 'unavailable' ? 'unavailable' : 'error' };
  }
  if (!page) return { kind: 'error' };
  if (page.content.length === 0 && page.totalElements === 0) return { kind: 'empty' };
  return { kind: 'ready', records: page.content, total: page.totalElements };
}

function requireExactId(actual: number, expected: number) {
  if (actual !== expected) throw new AlertGroupContractError('detail id does not match the command');
}

function requireWritableConvergence(actual: AlertGroupConverge, expected: {
  id: number;
  name: string;
  groupLabels: string[] | null;
  groupWait: number | null;
  groupInterval: number | null;
  repeatInterval: number | null;
  enable: boolean;
}) {
  const fieldsMatch = actual.id === expected.id
    && actual.name === expected.name
    && stringListsEqual(actual.groupLabels, expected.groupLabels)
    && actual.groupWait === expected.groupWait
    && actual.groupInterval === expected.groupInterval
    && actual.repeatInterval === expected.repeatInterval
    && actual.enable === expected.enable;
  if (!fieldsMatch) throw new AlertGroupContractError('canonical writable fields did not converge');
}

function stringListsEqual(actual: string[] | null, expected: string[] | null) {
  if (actual === null || expected === null) return actual === expected;
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

async function proveMissing(id: number) {
  try {
    await loadAlertGroup(id);
  } catch (reason) {
    if (classifyAlertGroupReadError(reason) === 'missing') return;
    throw reason;
  }
  throw new AlertGroupContractError('deleted detail still exists');
}
