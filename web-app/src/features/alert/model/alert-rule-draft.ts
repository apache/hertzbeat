/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import {
  AlertRuleContractError,
  alertRuleTypes,
  type AlertRule,
  type AlertRuleDatasource,
  type AlertRuleDataType,
  type AlertRuleKind,
  type AlertRuleType
} from './alert-rule-types';

type AlertRuleWritableSnapshot = {
  type: AlertRuleType | null;
  datasource: AlertRuleDatasource | null;
  expr: string | null;
  period: number | null;
  times: number | null;
  labels: Record<string, string> | null;
  template: string | null;
};

export type AlertRuleDraft = {
  id?: number;
  name: string;
  kind: AlertRuleKind;
  dataType: AlertRuleDataType;
  expr: string;
  template: string;
  labelsText: string;
  annotations: Record<string, string> | null;
  enable: boolean;
  period: number | null;
  times: number | null;
  /** Transient editor evidence; explicit payload builders never serialize it. */
  strategyChanged?: boolean;
  persisted?: AlertRuleWritableSnapshot;
};

export const periodicLogStarterExpression =
  "SELECT count(*) AS errorCount FROM hertzbeat_logs WHERE time_unix_nano >= NOW() - INTERVAL '30 second' AND severity_text = 'ERROR' HAVING count(*) > 2";

export function createAlertRuleDraft(): AlertRuleDraft {
  return {
    name: '',
    kind: 'realtime',
    dataType: 'metric',
    expr: '',
    template: '',
    labelsText: '',
    annotations: {},
    enable: true,
    period: 300,
    times: 3
  };
}

export function buildAlertRulePayload(draft: AlertRuleDraft) {
  const invalid = validateAlertRuleDraft(draft);
  if (invalid.length > 0) throw contract(`invalid writable fields: ${invalid.join(',')}`);
  const selectedType = typeForDraft(draft);
  return {
    ...(draft.id === undefined ? {} : { id: positiveInteger(draft.id, 'id') }),
    name: draft.name.trim(),
    type: preserveNullStrategy(draft, selectedType),
    datasource: resolveDatasource(draft, selectedType),
    expr: resolveNullableText(draft.expr, draft.strategyChanged ? undefined : draft.persisted?.expr),
    period: draft.period,
    times: draft.times,
    labels: resolveLabels(draft),
    annotations: cloneNullableMap(draft.annotations),
    template: resolveNullableText(draft.template, draft.persisted?.template),
    enable: draft.enable
  };
}

export function buildAlertRuleTogglePayload(rule: AlertRule, enable: boolean) {
  return {
    id: rule.id,
    name: rule.name,
    type: rule.type,
    datasource: rule.datasource,
    expr: rule.expr,
    period: rule.period,
    times: rule.times,
    labels: cloneNullableMap(rule.labels),
    annotations: cloneNullableMap(rule.annotations),
    template: rule.template,
    enable
  };
}

export function buildAlertRulePreviewRequest(draft: AlertRuleDraft) {
  const type = typeForDraft(draft);
  if (!validBoundedText(draft.expr, 2048)) throw contract('expr is invalid');
  return { type, datasource: datasourceFor(type), expr: draft.expr.trim() };
}

export function validateAlertRuleDraft(draft: AlertRuleDraft) {
  const invalid: Array<'name' | 'type' | 'expr' | 'template' | 'labels' | 'annotations' | 'period' | 'times'> = [];
  if (!validBoundedText(draft.name, 100)) invalid.push('name');
  if (!validDraftType(draft)) invalid.push('type');
  if (!validWritableText(draft.expr, draft.strategyChanged ? undefined : draft.persisted?.expr, 2048))
    invalid.push('expr');
  if (!validWritableText(draft.template, draft.persisted?.template, 2048)) invalid.push('template');
  if (!tryParseLabels(draft.labelsText)) invalid.push('labels');
  if (!validNullableMap(draft.annotations)) invalid.push('annotations');
  if (draft.kind === 'periodic' ? !isPositiveJavaInteger(draft.period) : !isNullablePositiveJavaInteger(draft.period))
    invalid.push('period');
  if (!isNullablePositiveJavaInteger(draft.times)) invalid.push('times');
  return invalid;
}

export function alertRuleDraftFromDetail(rule: AlertRule): AlertRuleDraft {
  const [kind, dataType] = (rule.type ?? 'realtime_metric').split('_') as [AlertRuleKind, AlertRuleDataType];
  return {
    id: rule.id,
    name: rule.name,
    kind,
    dataType,
    expr: rule.expr ?? '',
    template: rule.template ?? '',
    labelsText: Object.entries(rule.labels ?? {})
      .map(([key, value]) => `${key}:${value}`)
      .join(', '),
    annotations: cloneNullableMap(rule.annotations),
    enable: rule.enable,
    period: rule.period,
    times: rule.times,
    persisted: {
      type: rule.type,
      datasource: rule.datasource,
      expr: rule.expr,
      period: rule.period,
      times: rule.times,
      labels: cloneNullableMap(rule.labels),
      template: rule.template
    }
  };
}

/**
 * Retires expressions when the operator crosses evaluation grammars. The
 * previous persisted strategy can no longer justify nullable or stale input.
 */
export function buildAlertRuleStrategyPatch(
  draft: AlertRuleDraft,
  kind: AlertRuleKind,
  dataType: AlertRuleDataType
): Partial<AlertRuleDraft> {
  if (draft.kind === kind && draft.dataType === dataType) return {};
  return {
    kind,
    dataType,
    expr: kind === 'periodic' && dataType === 'log' ? periodicLogStarterExpression : '',
    period: kind === 'periodic' ? (draft.period ?? 300) : draft.period,
    strategyChanged: true
  };
}

function typeForDraft(draft: AlertRuleDraft): AlertRuleType {
  const value = `${draft.kind}_${draft.dataType}`;
  if (!alertRuleTypes.includes(value as AlertRuleType)) throw contract('unsupported alert rule strategy');
  return value as AlertRuleType;
}

function datasourceFor(type: AlertRuleType): AlertRuleDatasource {
  return type === 'periodic_log' || type === 'periodic_trace' ? 'sql' : 'promql';
}

function preserveNullStrategy(draft: AlertRuleDraft, selected: AlertRuleType) {
  // Preserve a legacy null strategy until the operator changes the visible strategy.
  return !draft.strategyChanged && draft.persisted?.type === null && selected === 'realtime_metric' ? null : selected;
}

function resolveDatasource(draft: AlertRuleDraft, selected: AlertRuleType) {
  // Datasource is persistence evidence and changes only with the visible strategy.
  const displayedOriginal = draft.persisted?.type ?? 'realtime_metric';
  if (!draft.strategyChanged && draft.persisted && selected === displayedOriginal) return draft.persisted.datasource;
  return datasourceFor(selected);
}

function resolveNullableText(value: string, original: string | null | undefined) {
  // The editor displays legacy null as empty; retain null until the operator enters text.
  return original === null && !value.trim() ? null : value.trim();
}

function validWritableText(value: string, original: string | null | undefined, max: number) {
  return (original === null && !value.trim()) || validBoundedText(value, max);
}

function resolveLabels(draft: AlertRuleDraft) {
  if (draft.persisted?.labels === null && !draft.labelsText.trim()) return null;
  return parseLabels(draft.labelsText);
}

function parseLabels(value: string) {
  const result: Record<string, string> = {};
  if (!value.trim()) return result;
  for (const item of value.split(',')) {
    const separator = item.indexOf(':');
    const key = item.slice(0, separator).trim();
    const labelValue = item.slice(separator + 1).trim();
    if (separator < 1 || !key || !labelValue || key in result)
      throw contract('labels must contain unique key:value entries');
    result[key] = labelValue;
  }
  return result;
}

function tryParseLabels(value: string) {
  try {
    parseLabels(value);
    return true;
  } catch {
    return false;
  }
}

function validBoundedText(value: unknown, max: number): value is string {
  return typeof value === 'string' && Boolean(value.trim()) && value.length <= max;
}

function positiveInteger(value: unknown, field: string) {
  if (!isPositiveInteger(value)) throw contract(`${field} must be a positive integer`);
  return value;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

function isPositiveJavaInteger(value: unknown): value is number {
  return isPositiveInteger(value) && value <= 2_147_483_647;
}

function isNullablePositiveJavaInteger(value: unknown): value is number | null {
  return value === null || isPositiveJavaInteger(value);
}

function validNullableMap(value: unknown): value is Record<string, string> | null {
  return (
    value === null ||
    (Boolean(value) &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.entries(value).every(([key, item]) => Boolean(key.trim()) && typeof item === 'string'))
  );
}

function cloneNullableMap(value: Record<string, string> | null) {
  return value === null ? null : { ...value };
}

function validDraftType(draft: AlertRuleDraft) {
  return (
    (draft.kind === 'realtime' || draft.kind === 'periodic') &&
    (draft.dataType === 'metric' || draft.dataType === 'log' || draft.dataType === 'trace') &&
    !(draft.kind === 'realtime' && draft.dataType === 'trace')
  );
}

function contract(message: string) {
  return new AlertRuleContractError(message);
}
