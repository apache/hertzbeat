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
import { App } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { classifyAlertRuleReadError, loadAlertRule, loadAlertRules, previewAlertRule, saveAlertRule } from '../alert-rule-api';
import {
  AlertRuleContractError, alertRuleDraftFromDetail, buildAlertRulePayload, createAlertRuleDraft,
  validateAlertRuleDraft, type AlertRule, type AlertRuleDraft, type AlertRuleKind, type AlertRulePage
} from '../alert-rule-model';

export type AlertRuleEditorFailure = 'missing' | 'unavailable' | 'error';
export type AlertRuleEditorDetailState =
  | { kind: 'loading' }
  | { kind: AlertRuleEditorFailure }
  | { kind: 'ready' };
export type AlertRulePreviewState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'ready'; records: Array<Record<string, unknown>> }
  | { kind: 'unavailable' }
  | { kind: 'error' };

type RouteState = {
  source: string;
  token: symbol;
  draft: AlertRuleDraft | null;
  preview: AlertRulePreviewState;
  command: 'idle' | 'saving';
  saveFailure: AlertRuleEditorFailure | undefined;
};

export function useAlertRuleEditorController(mode: 'new' | 'edit') {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { ruleId = '' } = useParams();
  const validId = canonicalId(ruleId);
  const routeSource = `${mode}:${ruleId}:${location.key}`;
  const routeToken = useMemo(() => Symbol(routeSource), [routeSource]);
  const sourceRef = useRouteSourceRef(routeSource);
  const initialDraft = useMemo(() => mode === 'new' ? createAlertRuleDraft() : null, [mode]);
  const [routeState, setRouteState] = useState<RouteState>(() => freshRouteState(routeSource, routeToken, initialDraft));
  const detailQuery = useQuery({
    queryKey: ['alert-rule-editor', mode === 'edit' ? ruleId : 'new'],
    queryFn: () => loadAlertRule(validId as number),
    enabled: mode === 'edit' && validId !== null,
    retry: false
  });

  const canonicalDraft = mode === 'new' ? initialDraft
    : detailQuery.data ? alertRuleDraftFromDetail(detailQuery.data) : null;
  const active = routeState.source === routeSource && routeState.token === routeToken
    ? routeState : freshRouteState(routeSource, routeToken, canonicalDraft);
  const draft = active.draft ?? canonicalDraft;
  const updateActive = (patch: Partial<RouteState>) => setRouteState(current => {
    const base = current.source === routeSource && current.token === routeToken
      ? current : freshRouteState(routeSource, routeToken, draft);
    return { ...base, ...patch };
  });
  const updateDraft = (patch: Partial<AlertRuleDraft>) => {
    if (!draft) return;
    setRouteState(current => {
      const base = current.source === routeSource && current.token === routeToken
        ? current : freshRouteState(routeSource, routeToken, draft);
      return { ...base, draft: { ...draft, ...patch }, preview: { kind: 'idle' }, saveFailure: undefined };
    });
  };
  const runPreview = async () => {
    const source = routeSource;
    if (!draft?.expr.trim()) {
      void message.warning(t('alertRules.expressionRequired'));
      return;
    }
    updateActive({ preview: { kind: 'loading' } });
    try {
      const records = await previewAlertRule(draft);
      if (sourceRef.current !== source) return;
      updateActive({ preview: records.length === 0 ? { kind: 'empty' } : { kind: 'ready', records } });
    } catch (reason) {
      if (sourceRef.current !== source) return;
      const kind = classifyAlertRuleReadError(reason) === 'unavailable' ? 'unavailable' : 'error';
      updateActive({ preview: { kind } });
    }
  };
  const save = async () => {
    const source = routeSource;
    if (!draft || validateAlertRuleDraft(draft).length > 0) {
      void message.warning(t('alertRules.validation'));
      return;
    }
    updateActive({ command: 'saving', saveFailure: undefined });
    try {
      await saveAlertRule(mode, draft);
      if (sourceRef.current !== source) return;
      const expected = buildAlertRulePayload(draft);
      if (mode === 'edit') await proveUpdated(draft, expected);
      else await proveCreated(expected);
      if (sourceRef.current !== source) return;
      void message.success(t('alertRules.saveSuccess'));
      void navigate('/alerts/rules');
    } catch (reason) {
      if (sourceRef.current !== source) return;
      updateActive({ saveFailure: classifyAlertRuleReadError(reason) });
      void message.error(t('alertRules.saveFailed'));
    } finally {
      if (sourceRef.current === source) updateActive({ command: 'idle' });
    }
  };
  const changeKind = (kind: AlertRuleKind) => {
    if (!draft) return;
    updateDraft({ kind, dataType: kind === 'realtime' && draft.dataType === 'trace' ? 'metric' : draft.dataType });
  };
  return {
    state: {
      command: active.command,
      detail: resolveDetail(mode, validId, detailQuery.isPending, detailQuery.error, draft),
      draft,
      preview: active.preview,
      saveFailure: active.saveFailure
    },
    updateDraft,
    changeKind,
    preview: runPreview,
    save,
    retryDetail: () => mode === 'edit' && validId !== null
      ? detailQuery.refetch().then(() => undefined) : Promise.resolve(),
    cancel: () => { void navigate('/alerts/rules'); }
  };
}

function useRouteSourceRef(routeSource: string) {
  const sourceRef = useRef(routeSource);
  useEffect(() => {
    sourceRef.current = routeSource;
    return () => { sourceRef.current = ''; };
  }, [routeSource]);
  return sourceRef;
}

function freshRouteState(source: string, token: symbol, draft: AlertRuleDraft | null): RouteState {
  return { source, token, draft, preview: { kind: 'idle' }, command: 'idle', saveFailure: undefined };
}

function resolveDetail(mode: 'new' | 'edit', id: number | null, pending: boolean,
  error: Error | null, draft: AlertRuleDraft | null): AlertRuleEditorDetailState {
  if (mode === 'new') return draft ? { kind: 'ready' } : { kind: 'error' };
  if (id === null) return { kind: 'error' };
  if (pending) return { kind: 'loading' };
  if (error) return { kind: classifyAlertRuleReadError(error) };
  return draft ? { kind: 'ready' } : { kind: 'loading' };
}

function canonicalId(value: string) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

async function proveUpdated(draft: AlertRuleDraft, expected: ReturnType<typeof buildAlertRulePayload>) {
  if (draft.id === undefined) throw new AlertRuleContractError('update proof requires id');
  const canonical = await loadAlertRule(draft.id);
  requireConvergence(canonical, expected, draft.id);
}

async function proveCreated(expected: ReturnType<typeof buildAlertRulePayload>) {
  const first = await loadAlertRules({ search: expected.name, pageIndex: 0, pageSize: 25 });
  const pages: AlertRulePage[] = [first];
  for (let pageIndex = 1; pageIndex < first.totalPages; pageIndex += 1) {
    const page = await loadAlertRules({ search: expected.name, pageIndex, pageSize: 25 });
    if (page.totalElements !== first.totalElements || page.totalPages !== first.totalPages) {
      throw new AlertRuleContractError('create proof page changed while traversing');
    }
    pages.push(page);
  }
  const matches = pages.flatMap(page => page.content).filter(rule => rule.name === expected.name);
  if (matches.length !== 1) throw new AlertRuleContractError('create proof requires one exact-name rule');
  requireConvergence(matches[0] as AlertRule, expected);
}

function requireConvergence(actual: AlertRule, expected: ReturnType<typeof buildAlertRulePayload>, expectedId?: number) {
  if (expectedId !== undefined && actual.id !== expectedId) throw new AlertRuleContractError('canonical id drifted');
  const scalarFieldsMatch = [
    actual.name === expected.name, actual.type === expected.type, actual.datasource === expected.datasource,
    actual.expr === expected.expr, actual.period === expected.period, actual.times === expected.times,
    actual.template === expected.template, actual.enable === expected.enable
  ].every(Boolean);
  if (!scalarFieldsMatch || !mapsEqual(actual.labels, expected.labels) || !mapsEqual(actual.annotations, expected.annotations)) {
    throw new AlertRuleContractError('canonical writable fields did not converge');
  }
}

function mapsEqual(actual: Record<string, string> | null, expected: Record<string, string> | null) {
  if (actual === null || expected === null) return actual === expected;
  const left = Object.keys(actual).sort();
  const right = Object.keys(expected).sort();
  return left.length === right.length && left.every((key, index) => key === right[index] && actual[key] === expected[key]);
}
