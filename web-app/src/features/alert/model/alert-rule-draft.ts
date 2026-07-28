/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import {
  AlertRuleContractError,
  alertRuleTypes,
  type AlertRule,
  type AlertRuleDataType,
  type AlertRuleDatasource,
  type AlertRuleKind,
  type AlertRuleType
} from './alert-rule-types';
import type { AlertRuleDraft } from './alert-rule-draft-contract';
import { createMetricAlertEditorDraft, metricAlertEditorFromExpression } from './alert-rule-metric-draft';

export type { AlertRuleDraft } from './alert-rule-draft-contract';
export type AlertRulePreviewRequest = {
  type: AlertRuleType;
  datasource: AlertRuleDatasource;
  expr: string;
};

const strategyForType: Record<AlertRuleType, { kind: AlertRuleKind; dataType: AlertRuleDataType }> = {
  realtime_metric: { kind: 'realtime', dataType: 'metric' },
  periodic_metric: { kind: 'periodic', dataType: 'metric' },
  realtime_log: { kind: 'realtime', dataType: 'log' },
  periodic_log: { kind: 'periodic', dataType: 'log' },
  periodic_trace: { kind: 'periodic', dataType: 'trace' }
};

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
    times: 3,
    metricEditor: createMetricAlertEditorDraft()
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

export function buildAlertRulePreviewRequest(draft: AlertRuleDraft): AlertRulePreviewRequest {
  const type = typeForDraft(draft);
  if (!validBoundedText(draft.expr, 2048)) throw contract('expr is invalid');
  return { type, datasource: datasourceFor(type), expr: draft.expr.trim() };
}

export function validateAlertRuleDraft(draft: AlertRuleDraft) {
  const invalid: InvalidAlertRuleDraftField[] = [];
  recordInvalidDraftField(invalid, 'name', !validBoundedText(draft.name, 100));
  recordInvalidDraftField(invalid, 'type', !validDraftType(draft));
  recordInvalidDraftField(invalid, 'expr', !validDraftExpression(draft));
  recordInvalidDraftField(invalid, 'template', !validWritableText(draft.template, draft.persisted?.template, 2048));
  recordInvalidDraftField(invalid, 'labels', !tryParseLabels(draft.labelsText));
  recordInvalidDraftField(invalid, 'annotations', !validNullableMap(draft.annotations));
  recordInvalidDraftField(invalid, 'period', !validDraftPeriod(draft));
  recordInvalidDraftField(invalid, 'times', !isNullablePositiveJavaInteger(draft.times));
  return invalid;
}

type InvalidAlertRuleDraftField = 'name' | 'type' | 'expr' | 'template' | 'labels' | 'annotations' | 'period' | 'times';

function recordInvalidDraftField(
  invalid: InvalidAlertRuleDraftField[],
  field: InvalidAlertRuleDraftField,
  condition: boolean
) {
  if (condition) invalid.push(field);
}

function validDraftExpression(draft: AlertRuleDraft) {
  return validWritableText(draft.expr, draft.strategyChanged ? undefined : draft.persisted?.expr, 2048);
}

function validDraftPeriod(draft: AlertRuleDraft) {
  return draft.kind === 'periodic' ? isPositiveJavaInteger(draft.period) : isNullablePositiveJavaInteger(draft.period);
}

export function alertRuleDraftFromDetail(rule: AlertRule): AlertRuleDraft {
  const resolvedType = rule.type ?? 'realtime_metric';
  const { kind, dataType } = strategyForType[resolvedType];
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
    ...(resolvedType === 'realtime_metric' ? { metricEditor: metricAlertEditorFromExpression(rule.expr ?? '') } : {}),
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
