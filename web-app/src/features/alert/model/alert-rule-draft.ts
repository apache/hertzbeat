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
import { parseMetricAlertCondition } from './alert-rule-condition';
import { logAlertFields } from './alert-rule-log-fields';
import { createMetricAlertEditorDraft, metricAlertEditorFromExpression } from './alert-rule-metric-draft';
import { parseRealtimeMetricExpression } from './alert-rule-metric-expression';

export type { AlertRuleDraft } from './alert-rule-draft-contract';
export type AlertRulePreviewRequest = {
  type: AlertRuleType;
  datasource: AlertRuleDatasource;
  expr: string;
};

export const alertRuleSeverities = ['emergency', 'critical', 'warning'] as const;
export const alertRuleModes = ['group', 'individual'] as const;
type AlertRuleSeverity = (typeof alertRuleSeverities)[number];
type AlertRuleMode = (typeof alertRuleModes)[number];

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
    authoringMode: 'structured',
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
  recordInvalidDraftField(invalid, 'template', !validWritableText(draft.template, draft.persisted?.template, 200));
  recordInvalidDraftField(invalid, 'labels', !tryParseLabels(draft.labelsText));
  recordInvalidDraftField(
    invalid,
    'severity',
    (!draft.persisted || draft.strategyChanged === true) &&
      !alertRuleSeverities.includes(alertRuleLabelValue(draft.labelsText, 'severity') as AlertRuleSeverity)
  );
  recordInvalidDraftField(
    invalid,
    'alertMode',
    (!draft.persisted || draft.strategyChanged === true) &&
      draft.dataType === 'log' &&
      !alertRuleModes.includes(alertRuleLabelValue(draft.labelsText, 'alert_mode') as AlertRuleMode)
  );
  recordInvalidDraftField(invalid, 'annotations', !validNullableMap(draft.annotations));
  recordInvalidDraftField(invalid, 'period', !validDraftPeriod(draft));
  recordInvalidDraftField(invalid, 'times', !isNullablePositiveJavaInteger(draft.times));
  return invalid;
}

export type InvalidAlertRuleDraftField =
  'name' | 'type' | 'expr' | 'template' | 'labels' | 'annotations' | 'period' | 'times' | 'severity' | 'alertMode';

function recordInvalidDraftField(
  invalid: InvalidAlertRuleDraftField[],
  field: InvalidAlertRuleDraftField,
  condition: boolean
) {
  if (condition) invalid.push(field);
}

function validDraftExpression(draft: AlertRuleDraft) {
  if (!validWritableText(draft.expr, draft.strategyChanged ? undefined : draft.persisted?.expr, 2048)) return false;
  if (realtimeLogExpressionExceedsLimit(draft)) return false;
  if (periodicMetricExpressionExceedsLimit(draft)) return false;
  if (requiresCompleteMetricExpression(draft)) {
    return parseRealtimeMetricExpression(draft.expr) !== null;
  }
  return true;
}

function periodicMetricExpressionExceedsLimit(draft: AlertRuleDraft) {
  return draft.kind === 'periodic' && draft.dataType === 'metric' && draft.expr.length > 100;
}

function realtimeLogExpressionExceedsLimit(draft: AlertRuleDraft) {
  return draft.kind === 'realtime' && draft.dataType === 'log' && draft.expr.length > 200;
}

function requiresCompleteMetricExpression(draft: AlertRuleDraft) {
  return (
    draft.kind === 'realtime' &&
    draft.dataType === 'metric' &&
    draft.metricEditor?.kind === 'targeted' &&
    draft.metricEditor.target?.kind === 'metric'
  );
}

function validDraftPeriod(draft: AlertRuleDraft) {
  return draft.kind === 'periodic' ? isPositiveJavaInteger(draft.period) : isNullablePositiveJavaInteger(draft.period);
}

export function alertRuleDraftFromDetail(rule: AlertRule): AlertRuleDraft {
  const resolvedType = rule.type ?? 'realtime_metric';
  const { kind, dataType } = strategyForType[resolvedType];
  const expression = rule.expr ?? '';
  const metricEditor = resolvedType === 'realtime_metric' ? metricAlertEditorFromExpression(expression) : undefined;
  return {
    id: rule.id,
    name: rule.name,
    kind,
    dataType,
    expr: expression,
    template: rule.template ?? '',
    labelsText: serializeLabels(rule.labels ?? {}),
    annotations: cloneNullableMap(rule.annotations),
    enable: rule.enable,
    period: rule.period,
    times: rule.times,
    authoringMode: detailAuthoringMode(resolvedType, expression, metricEditor),
    ...(metricEditor ? { metricEditor } : {}),
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

function detailAuthoringMode(
  type: AlertRuleType,
  expression: string,
  metricEditor: ReturnType<typeof metricAlertEditorFromExpression> | undefined
) {
  if (type === 'realtime_metric') {
    if (metricEditor?.kind === 'targeted') return metricEditor.authoring.mode;
    return expression.trim() ? 'expert' : 'structured';
  }
  if (type === 'realtime_log') {
    return !expression.trim() || parseMetricAlertCondition(expression, logAlertFields) ? 'structured' : 'expert';
  }
  return 'structured';
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
  const result: Record<string, string> = Object.create(null) as Record<string, string>;
  if (!value.trim()) return result;
  for (const [rawKey, rawValue] of parseLabelEntries(value)) {
    const key = rawKey.trim();
    const labelValue = rawValue.trim();
    if (!key || !labelValue || Object.hasOwn(result, key))
      throw contract('labels must contain unique key:value entries');
    result[key] = labelValue;
  }
  return result;
}

function parseLabelEntries(value: string): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  let key = '';
  let labelValue = '';
  let readingValue = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index] ?? '';
    const next = value[index + 1];
    if (character === '\\' && next && ['\\', ',', ':'].includes(next)) {
      if (readingValue) labelValue += next;
      else key += next;
      index += 1;
      continue;
    }
    if (!readingValue && character === ':') {
      readingValue = true;
      continue;
    }
    if (readingValue && character === ',') {
      entries.push([key, labelValue]);
      key = '';
      labelValue = '';
      readingValue = false;
      continue;
    }
    if (readingValue) labelValue += character;
    else key += character;
  }
  entries.push([key, labelValue]);
  return entries;
}

export function alertRuleLabelValue(value: string, key: string) {
  try {
    return parseLabels(value)[key] ?? '';
  } catch {
    return '';
  }
}

export function updateAlertRuleLabel(value: string, key: string, labelValue: string) {
  let labels: Record<string, string> = Object.create(null) as Record<string, string>;
  try {
    labels = parseLabels(value);
  } catch {
    // A controlled map editor cannot safely merge malformed source text.
  }
  const normalizedKey = key.trim();
  const normalizedValue = labelValue.trim();
  if (!normalizedKey) return serializeLabels(labels);
  if (normalizedValue) labels[normalizedKey] = normalizedValue;
  else delete labels[normalizedKey];
  return serializeLabels(labels);
}

export function alertRuleCustomLabels(value: string) {
  try {
    const labels = parseLabels(value);
    delete labels.severity;
    delete labels.alert_mode;
    return labels;
  } catch {
    return {};
  }
}

export function replaceAlertRuleCustomLabels(value: string, customLabels: Record<string, string>) {
  const reserved = {
    severity: alertRuleLabelValue(value, 'severity'),
    alert_mode: alertRuleLabelValue(value, 'alert_mode')
  };
  const labels: Record<string, string> = Object.create(null) as Record<string, string>;
  if (reserved.severity) labels.severity = reserved.severity;
  if (reserved.alert_mode) labels.alert_mode = reserved.alert_mode;
  for (const [key, labelValue] of Object.entries(customLabels)) {
    if (key !== 'severity' && key !== 'alert_mode') labels[key] = labelValue;
  }
  return serializeLabels(labels);
}

function serializeLabels(labels: Record<string, string>) {
  return Object.entries(labels)
    .map(([key, value]) => `${escapeLabelPart(key)}:${escapeLabelPart(value)}`)
    .join(', ');
}

function escapeLabelPart(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll(',', '\\,').replaceAll(':', '\\:');
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
