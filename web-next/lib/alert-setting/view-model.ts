import type { AlertDefine, PageResult } from '@/lib/types';
import {
  buildSignalAlertMatchLabels,
  buildSignalAlertWorkspaceHref,
  buildSignalEntityContextRows,
  stripReturnLabelFromHref,
  type SignalEntityContextRow,
  type SignalRouteContext
} from '../signal-route-context';
import type { DatasourceStatusPayload } from './controller';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;
type AlertSettingWorkflowActionKey = 'notice' | 'group' | 'silence' | 'inhibit';

export type AlertSettingWorkflowAction = {
  key: AlertSettingWorkflowActionKey;
  label: string;
  copy: string;
  href: string;
};

export type AlertSettingEvidenceContext = {
  signal: string;
  title: string;
  copy: string;
  labelsText: string;
  sourceQuery?: string;
  sourceQueryType?: string;
  returnHref?: string;
  rows: SignalEntityContextRow[];
  workflowActions: AlertSettingWorkflowAction[];
};

function normalizeSignal(signal: string | null | undefined) {
  if (signal === 'logs' || signal === 'traces' || signal === 'metrics') {
    return signal;
  }
  return undefined;
}

function firstText(...values: Array<string | null | undefined>) {
  return values.map(value => value?.trim()).find((value): value is string => Boolean(value));
}

function formatAlertSettingFact(value: string | null | undefined, emptyValue: string) {
  const text = value?.trim() ?? '';
  return text || emptyValue;
}

function formatAlertSettingRuntimeSummary(item: AlertDefine, t: Translator) {
  const isPeriodic = String(item.type || '').startsWith('periodic_');
  const parts: string[] = [];
  if (isPeriodic && item.period != null) {
    parts.push(t('alert.setting.runtime.period', { period: item.period }));
  }
  if (item.times != null) {
    parts.push(t('alert.setting.runtime.times', { times: item.times }));
  }
  if (item.priority != null) {
    parts.push(t('alert.setting.runtime.priority', { priority: item.priority }));
  }
  return parts.join(' · ');
}

function compactSourceQuery(value: string | null | undefined) {
  const normalized = firstText(value);
  if (!normalized) return undefined;
  return normalized.length > 240 ? `${normalized.slice(0, 237)}...` : normalized;
}

function buildAlertSettingWorkflowActions(
  signal: 'metrics' | 'logs' | 'traces' | undefined,
  context: SignalRouteContext,
  t: Translator
): AlertSettingWorkflowAction[] {
  return (['notice', 'group', 'silence', 'inhibit'] as const).map(key => ({
    key,
    label: t(`alert.center.operation.${key}.label`),
    copy: t(`alert.center.operation.${key}.copy`),
    href: buildSignalAlertWorkspaceHref(key, signal, context)
  }));
}

function formatAlertDefineType(type: string | undefined, t: Translator) {
  switch (type) {
    case 'periodic_metric':
      return t('alert.setting.type.periodic.metric');
    case 'realtime_log':
      return t('alert.setting.type.realtime.log');
    case 'periodic_log':
      return t('alert.setting.type.periodic.log');
    case 'periodic_trace':
      return t('alert.setting.type.periodic.trace');
    case 'realtime_metric':
    default:
      return t('alert.setting.type.realtime.metric');
  }
}

export function buildAlertSettingEvidenceContext(
  signal: string | null | undefined,
  context: SignalRouteContext,
  t: Translator
): AlertSettingEvidenceContext | null {
  const normalizedSignal = normalizeSignal(signal);
  const labelsText = buildSignalAlertMatchLabels(normalizedSignal, context);
  const returnHref = stripReturnLabelFromHref(context.returnTo);
  const rows = buildSignalEntityContextRows(context, {}, t);
  const sourceQuery = compactSourceQuery(context.alertQuery);
  const sourceQueryType = firstText(context.alertQueryType);
  if (sourceQuery) {
    rows.push({
      label: t('alert.rule.evidence.query.label'),
      value: sourceQuery,
      meta: sourceQueryType || t('alert.rule.evidence.query.meta')
    });
  }
  if (!normalizedSignal && !labelsText && !returnHref) {
    return null;
  }
  const signalName = t(`alert.rule.signal.${normalizedSignal || 'default'}`);

  return {
    signal: normalizedSignal || 'context',
    title: t('alert.rule.evidence.setting.title', { signal: signalName }),
    copy: t('alert.rule.evidence.setting.copy'),
    labelsText,
    sourceQuery,
    sourceQueryType,
    returnHref,
    rows,
    workflowActions: buildAlertSettingWorkflowActions(normalizedSignal, context, t)
  };
}

export function buildAlertSettingFacts(
  list: PageResult<AlertDefine>,
  datasourceStatus: DatasourceStatusPayload,
  t: Translator
) {
  const datasourceState = datasourceStatus.code === 0 ? t('common.ready') : t('common.attention');
  return [
    { label: t('alert.setting.fact.workspace'), value: 'alert/setting' },
    { label: t('alert.setting.fact.total'), value: String(list.totalElements || 0) },
    { label: t('common.current-page-count'), value: String(list.content?.length || 0) },
    { label: t('alert.setting.fact.datasource'), value: datasourceState }
  ];
}

export function buildAlertSettingRows(
  items: AlertDefine[],
  t: Translator,
  formatTime: (value?: number | string | null) => string
) {
  const emptyValue = t('common.none');
  return items.map(item => ({
    key: String(item.id),
    name: item.name || t('setting.define.item.fallback'),
    type: formatAlertDefineType(item.type, t),
    runtimeSummary: formatAlertSettingRuntimeSummary(item, t),
    expr: formatAlertSettingFact(item.expr, emptyValue),
    template: formatAlertSettingFact(item.template, emptyValue),
    labels: Object.entries(item.labels || {}).map(([key, value]) => `${key}:${value}`),
    enabledLabel: item.enable ? t('common.enabled') : t('common.disabled'),
    updatedAt: formatTime(item.gmtUpdate || item.gmtCreate || null)
  }));
}
