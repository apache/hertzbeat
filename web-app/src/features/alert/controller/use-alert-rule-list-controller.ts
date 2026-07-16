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
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  classifyAlertRuleReadError, deleteAlertRules, loadAlertRule, loadAlertRules, updateAlertRuleEnabled
} from '../alert-rule-api';
import {
  AlertRuleContractError, buildAlertRuleTogglePayload, readAlertRuleQuery, writeAlertRuleQuery,
  type AlertRule, type AlertRulePage, type AlertRuleQuery
} from '../alert-rule-model';

export type AlertRuleListState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | { kind: 'ready'; records: AlertRule[]; total: number };

const listKey = (query: AlertRuleQuery) => ['alert-rules', query] as const;

export function useAlertRuleListController() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const query = readAlertRuleQuery(params);
  const source = writeAlertRuleQuery(query).toString();
  const [searchState, setSearchState] = useState({ source, value: query.search });
  const [command, setCommand] = useState<'idle' | 'operating'>('idle');
  const queryChanged = searchState.source !== source;
  if (queryChanged) setSearchState({ source, value: query.search });
  const search = queryChanged ? query.search : searchState.value;
  const listQuery = useQuery({ queryKey: listKey(query), queryFn: () => loadAlertRules(query), retry: false });
  const updateQuery = (patch: Partial<AlertRuleQuery>) => setParams(writeAlertRuleQuery({ ...query, ...patch }));
  const rereadList = () => queryClient.fetchQuery({
    queryKey: listKey(query), queryFn: () => loadAlertRules(query), staleTime: 0
  });
  const operate = async (operation: () => Promise<void>) => {
    setCommand('operating');
    try {
      await operation();
      void message.success(t('alertRules.operationSuccess'));
    } catch {
      void message.error(t('alertRules.operationFailed'));
    } finally {
      setCommand('idle');
    }
  };
  const toggle = (rule: AlertRule, enable: boolean) => operate(async () => {
    await updateAlertRuleEnabled(rule, enable);
    const canonical = await loadAlertRule(rule.id);
    requireWritableConvergence(canonical, buildAlertRuleTogglePayload(rule, enable));
    await rereadList();
  });
  const remove = (id: number) => operate(async () => {
    await deleteAlertRules([id]);
    await proveMissing(id);
    const canonical = await rereadList();
    if (canonical.content.some(record => record.id === id)) throw new AlertRuleContractError('deleted id remains');
  });
  return {
    state: {
      command, list: resolveListState(listQuery.isPending, listQuery.error, listQuery.data), query,
      refreshing: listQuery.isFetching, search
    },
    setSearch: (value: string) => setSearchState(current => ({ ...current, value })),
    submitSearch: () => updateQuery({ search: search.trim(), pageIndex: 0 }),
    changePage: (page: number, pageSize: number) => updateQuery({
      pageIndex: pageSize === query.pageSize ? page - 1 : 0, pageSize
    }),
    refresh: () => rereadList().then(() => undefined).catch(() => undefined),
    create: () => { void navigate('/alerts/rules/new'); },
    edit: (id: number) => { void navigate(`/alerts/rules/${id}/edit`); },
    toggle,
    remove
  };
}

function resolveListState(pending: boolean, error: Error | null, page: AlertRulePage | undefined): AlertRuleListState {
  if (pending) return { kind: 'loading' };
  if (error) return { kind: classifyAlertRuleReadError(error) === 'unavailable' ? 'unavailable' : 'error' };
  if (!page) return { kind: 'error' };
  if (page.content.length === 0 && page.totalElements === 0) return { kind: 'empty' };
  return { kind: 'ready', records: page.content, total: page.totalElements };
}

function requireWritableConvergence(actual: AlertRule, expected: ReturnType<typeof buildAlertRuleTogglePayload>) {
  if (actual.id !== expected.id || actual.name !== expected.name || actual.type !== expected.type
    || actual.datasource !== expected.datasource || actual.expr !== expected.expr || actual.period !== expected.period
    || actual.times !== expected.times || !mapsEqual(actual.labels, expected.labels)
    || !mapsEqual(actual.annotations, expected.annotations) || actual.template !== expected.template
    || actual.enable !== expected.enable) {
    throw new AlertRuleContractError('canonical writable fields did not converge');
  }
}

function mapsEqual(actual: Record<string, string> | null, expected: Record<string, string> | null) {
  if (actual === null || expected === null) return actual === expected;
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  return actualKeys.length === expectedKeys.length
    && actualKeys.every((key, index) => key === expectedKeys[index] && actual[key] === expected[key]);
}

async function proveMissing(id: number) {
  try {
    await loadAlertRule(id);
  } catch (reason) {
    if (classifyAlertRuleReadError(reason) === 'missing') return;
    throw reason;
  }
  throw new AlertRuleContractError('deleted detail still exists');
}
