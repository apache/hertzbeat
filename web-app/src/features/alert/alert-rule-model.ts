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

export const alertRulePageSizes = [8, 15, 25] as const;

export type AlertRuleQuery = { search: string; pageIndex: number; pageSize: number };
export type AlertRuleKind = 'realtime' | 'periodic';
export type AlertRuleDataType = 'metric' | 'log' | 'trace';

export type AlertRuleDraft = {
  id?: number;
  name: string;
  kind: AlertRuleKind;
  dataType: AlertRuleDataType;
  expr: string;
  template: string;
  labelsText: string;
  enable: boolean;
  period: number;
  times: number;
};

export type AlertRule = {
  id: number;
  name?: string;
  type?: string;
  datasource?: string;
  expr?: string;
  template?: string;
  labels?: Record<string, string>;
  enable?: boolean;
  period?: number;
  times?: number;
  gmtUpdate?: string | number | null;
};

export function readAlertRuleQuery(params: URLSearchParams): AlertRuleQuery {
  const pageIndex = Number.parseInt(params.get('pageIndex') ?? '', 10);
  const pageSize = Number.parseInt(params.get('pageSize') ?? '', 10);
  return {
    search: params.get('search')?.trim() ?? '',
    pageIndex: Number.isFinite(pageIndex) && pageIndex >= 0 ? pageIndex : 0,
    pageSize: alertRulePageSizes.includes(pageSize as typeof alertRulePageSizes[number]) ? pageSize : 8
  };
}

export function writeAlertRuleQuery(query: AlertRuleQuery) {
  const params = new URLSearchParams({ pageIndex: String(query.pageIndex), pageSize: String(query.pageSize) });
  if (query.search) params.set('search', query.search);
  return params;
}

export function buildAlertRuleListPath(query: AlertRuleQuery) {
  const params = new URLSearchParams({
    pageIndex: String(query.pageIndex),
    pageSize: String(query.pageSize),
    sort: 'id',
    order: 'desc'
  });
  if (query.search.trim()) params.set('search', encodeURIComponent(JSON.stringify([query.search.trim()])));
  return `/api/alert/defines?${params.toString()}`;
}

export function createAlertRuleDraft(): AlertRuleDraft {
  return {
    name: '',
    kind: 'realtime',
    dataType: 'metric',
    expr: '',
    template: '',
    labelsText: '',
    enable: true,
    period: 300,
    times: 3
  };
}

function parseLabels(value: string) {
  return value.split(',').map(item => item.trim()).filter(Boolean).reduce<Record<string, string>>((labels, item) => {
    const [rawKey, ...rest] = item.split(':');
    const key = rawKey?.trim();
    if (key) labels[key] = rest.join(':').trim() || key;
    return labels;
  }, {});
}

function datasourceFor(draft: AlertRuleDraft) {
  return draft.kind === 'periodic' && (draft.dataType === 'log' || draft.dataType === 'trace') ? 'sql' : 'promql';
}

export function buildAlertRulePayload(draft: AlertRuleDraft) {
  return {
    ...(draft.id ? { id: draft.id } : {}),
    name: draft.name.trim(),
    type: `${draft.kind}_${draft.dataType}`,
    datasource: datasourceFor(draft),
    expr: draft.expr.trim(),
    template: draft.template.trim(),
    labels: parseLabels(draft.labelsText),
    annotations: {},
    enable: draft.enable,
    period: draft.period,
    times: draft.times
  };
}

export function validateAlertRuleDraft(draft: AlertRuleDraft) {
  const invalid: Array<'name' | 'expr' | 'template'> = [];
  if (!draft.name.trim()) invalid.push('name');
  if (!draft.expr.trim()) invalid.push('expr');
  if (!draft.template.trim()) invalid.push('template');
  return invalid;
}

function parseAlertRuleType(type?: string): { kind: AlertRuleKind; dataType: AlertRuleDataType } {
  const [kindValue, dataTypeValue] = (type ?? 'realtime_metric').split('_');
  const kind: AlertRuleKind = kindValue === 'periodic' ? 'periodic' : 'realtime';
  const parsedDataType: AlertRuleDataType = dataTypeValue === 'log' || dataTypeValue === 'trace' ? dataTypeValue : 'metric';
  return {
    kind,
    dataType: kind === 'realtime' && parsedDataType === 'trace' ? 'metric' : parsedDataType
  };
}

export function alertRuleDraftFromDetail(rule: AlertRule): AlertRuleDraft {
  const { kind, dataType } = parseAlertRuleType(rule.type);
  return {
    id: rule.id,
    name: rule.name ?? '',
    kind,
    dataType,
    expr: rule.expr ?? '',
    template: rule.template ?? '',
    labelsText: Object.entries(rule.labels ?? {}).map(([key, value]) => `${key}:${value}`).join(', '),
    enable: rule.enable ?? true,
    period: rule.period ?? 300,
    times: rule.times ?? 3
  };
}
