import type { AlertSilence, PageResult } from '@/lib/types';
import {
  buildAlertRuleEvidenceCopy,
  buildAlertRuleEvidenceDraftName,
  buildAlertRuleEvidenceFallbackTarget,
  buildAlertRuleEvidenceTitle
} from '../alert-rule-evidence-copy';
import type { AlertSilenceFormDraft } from './controller';
import {
  buildSignalEntityContextRows,
  stripReturnLabelFromHref,
  type SignalEntityContextRow,
  type SignalRouteContext
} from '../signal-route-context';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type AlertSilenceEvidenceContext = {
  signal: string;
  title: string;
  copy: string;
  labelsText: string;
  returnHref?: string;
  rows: SignalEntityContextRow[];
  draftPatch: Partial<AlertSilenceFormDraft>;
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

function formatAlertSilenceDays(days: string[] | null | undefined, emptyValue: string) {
  const text = (days || []).map(day => day.trim()).filter(Boolean).join(', ');
  return text || emptyValue;
}

function buildAlertSilenceLabels(signal: string | undefined, context: SignalRouteContext) {
  return [
    ['hertzbeat.signal', signal],
    ['hertzbeat.entity.id', context.entityId],
    ['service.name', context.serviceName],
    ['service.namespace', context.serviceNamespace],
    ['deployment.environment', context.environment],
    ['trace_id', context.traceId],
    ['span_id', context.spanId],
    ['hertzbeat.source', context.source],
    ['hertzbeat.collector', context.collector],
    ['hertzbeat.template', context.template]
  ]
    .map(([key, value]) => {
      const normalizedValue = firstText(value);
      return normalizedValue ? `${key}:${normalizedValue}` : undefined;
    })
    .filter((value): value is string => Boolean(value))
    .join(', ');
}

export function buildAlertSilenceEvidenceContext(
  signal: string | null | undefined,
  context: SignalRouteContext,
  t: Translator
): AlertSilenceEvidenceContext | null {
  const normalizedSignal = normalizeSignal(signal);
  const targetName = firstText(context.serviceName, context.entityName, context.entityId) || buildAlertRuleEvidenceFallbackTarget(t);
  const labelsText = buildAlertSilenceLabels(normalizedSignal, context);
  const returnHref = stripReturnLabelFromHref(context.returnTo);
  const rows = buildSignalEntityContextRows(context, {}, t);
  if (!normalizedSignal && !labelsText && !returnHref) {
    return null;
  }

  return {
    signal: normalizedSignal || 'context',
    title: buildAlertRuleEvidenceTitle('silence', normalizedSignal, t),
    copy: buildAlertRuleEvidenceCopy('silence', t),
    labelsText,
    returnHref,
    rows,
    draftPatch: {
      name: buildAlertRuleEvidenceDraftName('silence', normalizedSignal, targetName, t),
      matchAll: false,
      labelsText
    }
  };
}

export function buildAlertSilenceFacts(list: PageResult<AlertSilence>, t: Translator) {
  return [
    { label: t('alert.setting.fact.workspace'), value: 'alert/silence' },
    { label: t('common.total'), value: String(list.totalElements || 0) },
    { label: t('common.current-page-count'), value: String(list.content?.length || 0) }
  ];
}

export function buildAlertSilenceMetrics(items: AlertSilence[], t: Translator) {
  const enabledCount = items.filter(item => item.enable).length;
  return [
    { label: t('alert.rule.metric.current-page-enabled'), value: String(enabledCount), tone: enabledCount > 0 ? 'success' : undefined },
    { label: t('alert.silence.match-all'), value: String(items.filter(item => item.matchAll).length), tone: items.some(item => item.matchAll) ? 'warning' : undefined },
    { label: t('alert.rule.metric.sample-rule'), value: items[0]?.name || t('common.none') }
  ];
}

export function buildAlertSilenceRows(items: AlertSilence[], t: Translator, formatTime: (value?: number | string | null) => string) {
  const enabledText = t('common.enabled');
  const disabledText = t('common.disabled');
  return items.map(item => {
    const matchAllText = item.matchAll ? t('common.boolean.true') : t('common.boolean.false');
    return {
      key: String(item.id),
      title: item.name || t('alert.silence.default-title'),
      copy: `${item.enable ? enabledText : disabledText} · ${t('alert.silence.match-all')} ${matchAllText} · ${t('alert.silence.labels')} ${Object.keys(item.labels || {}).length}`,
      meta: `${t('alert.silence.times')} ${item.times || 0} · ${t('common.updated')} ${formatTime(item.gmtUpdate || item.gmtCreate || null)}`
    };
  });
}

export function buildAlertSilenceSelectedRows(selected: AlertSilence | null, t: Translator) {
  const enabledText = t('common.enabled');
  const disabledText = t('common.disabled');
  const emptyValue = t('common.none');
  if (!selected) {
    return [{ title: t('alert.silence.selected.empty.title'), copy: t('alert.silence.selected.empty.copy'), meta: emptyValue }];
  }

  return [
    { title: selected.name || t('alert.silence.default-title'), copy: selected.enable ? enabledText : disabledText, meta: t('alert.rule.selected.id-meta', { id: selected.id }) },
    { title: t('alert.silence.selected.strategy'), copy: selected.matchAll ? t('alert.silence.selected.strategy.all') : t('alert.silence.selected.strategy.any'), meta: t('alert.silence.selected.type-meta', { type: selected.type || t('common.none') }) },
    { title: t('alert.silence.selected.labels-days'), copy: `${Object.keys(selected.labels || {}).length} ${t('alert.silence.labels')}`, meta: `${t('alert.silence.days')} ${formatAlertSilenceDays(selected.days, emptyValue)}` }
  ];
}

export function buildAlertSilenceNoteRows(t: Translator, times: number) {
  return [
    { title: t('alert.silence.notes.times.title'), copy: String(times), meta: t('alert.silence.notes.times.meta') },
    { title: t('alert.silence.notes.query.title'), copy: t('alert.rule.notes.search-sort-copy'), meta: t('alert.silence.notes.query.meta') }
  ];
}

export function validateAlertSilenceForm(draft: AlertSilenceFormDraft, t: Translator) {
  if (!draft.name.trim()) {
    return t('alert.silence.validation.name');
  }
  if (!draft.matchAll && !draft.labelsText.trim()) {
    return t('alert.silence.validation.labels');
  }
  return null;
}
