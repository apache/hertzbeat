import type { AlertInhibit, PageResult } from '@/lib/types';
import {
  buildAlertRuleEvidenceCopy,
  buildAlertRuleEvidenceDraftName,
  buildAlertRuleEvidenceFallbackTarget,
  buildAlertRuleEvidenceTitle
} from '../alert-rule-evidence-copy';
import type { AlertInhibitFormDraft } from './controller';
import {
  buildSignalAlertMatchLabels,
  buildSignalEntityContextRows,
  stripReturnLabelFromHref,
  type SignalEntityContextRow,
  type SignalRouteContext
} from '../signal-route-context';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type AlertInhibitEvidenceContext = {
  signal: string;
  title: string;
  copy: string;
  sourceLabelsText: string;
  targetLabelsText: string;
  equalLabelsText: string;
  returnHref?: string;
  rows: SignalEntityContextRow[];
  draftPatch: Partial<AlertInhibitFormDraft>;
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

function formatAlertInhibitEqualLabels(labels: string[] | null | undefined, emptyValue: string) {
  const text = (labels || []).map(label => label.trim()).filter(Boolean).join(', ');
  return text || emptyValue;
}

function buildAlertInhibitEqualLabels(context: SignalRouteContext) {
  return [
    ['hertzbeat.entity.id', context.entityId],
    ['service.name', context.serviceName],
    ['service.namespace', context.serviceNamespace],
    ['deployment.environment', context.environment]
  ]
    .map(([key, value]) => (firstText(value) ? key : undefined))
    .filter((value): value is string => Boolean(value))
    .join(', ');
}

export function buildAlertInhibitEvidenceContext(
  signal: string | null | undefined,
  context: SignalRouteContext,
  t: Translator
): AlertInhibitEvidenceContext | null {
  const normalizedSignal = normalizeSignal(signal);
  const targetName = firstText(context.serviceName, context.entityName, context.entityId) || buildAlertRuleEvidenceFallbackTarget(t);
  const labelsText = buildSignalAlertMatchLabels(normalizedSignal, context);
  const equalLabelsText = buildAlertInhibitEqualLabels(context);
  const returnHref = stripReturnLabelFromHref(context.returnTo);
  const rows = buildSignalEntityContextRows(context, {}, t);
  if (!normalizedSignal && !labelsText && !returnHref) {
    return null;
  }

  return {
    signal: normalizedSignal || 'context',
    title: buildAlertRuleEvidenceTitle('inhibit', normalizedSignal, t),
    copy: buildAlertRuleEvidenceCopy('inhibit', t),
    sourceLabelsText: labelsText,
    targetLabelsText: labelsText,
    equalLabelsText,
    returnHref,
    rows,
    draftPatch: {
      name: buildAlertRuleEvidenceDraftName('inhibit', normalizedSignal, targetName, t),
      sourceLabelsText: labelsText,
      targetLabelsText: labelsText,
      equalLabelsText
    }
  };
}

export function buildAlertInhibitFacts(list: PageResult<AlertInhibit>, t: Translator) {
  return [
    { label: t('alert.setting.fact.workspace'), value: 'alert/inhibit' },
    { label: t('common.total'), value: String(list.totalElements || 0) },
    { label: t('common.current-page-count'), value: String(list.content?.length || 0) }
  ];
}

export function buildAlertInhibitMetrics(items: AlertInhibit[], t: Translator) {
  const enabledCount = items.filter(item => item.enable).length;
  const equalLabelsCount = items.reduce((sum, item) => sum + (item.equalLabels?.length || 0), 0);
  return [
    { label: t('alert.rule.metric.current-page-enabled'), value: String(enabledCount), tone: enabledCount > 0 ? 'success' : undefined },
    { label: t('alert.inhibit.equal'), value: String(equalLabelsCount) },
    { label: t('alert.rule.metric.sample-rule'), value: items[0]?.name || t('common.none') }
  ];
}

export function buildAlertInhibitRows(items: AlertInhibit[], t: Translator, formatTime: (value?: number | string | null) => string) {
  const enabledText = t('common.enabled');
  const disabledText = t('common.disabled');
  const emptyValue = t('common.none');
  return items.map(item => ({
    key: String(item.id),
    title: item.name || t('alert.inhibit.default-title'),
    copy: `${item.enable ? enabledText : disabledText} · ${t('alert.inhibit.source')} ${Object.keys(item.sourceLabels || {}).length} · ${t('alert.inhibit.target')} ${Object.keys(item.targetLabels || {}).length}`,
    meta: `${t('alert.inhibit.equal')} ${formatAlertInhibitEqualLabels(item.equalLabels, emptyValue)} · ${t('common.updated')} ${formatTime(item.gmtUpdate || item.gmtCreate || null)}`
  }));
}

export function buildAlertInhibitSelectedRows(selected: AlertInhibit | null, t: Translator) {
  const enabledText = t('common.enabled');
  const disabledText = t('common.disabled');
  const emptyValue = t('common.none');
  if (!selected) {
    return [{ title: t('alert.inhibit.selected.empty.title'), copy: t('alert.inhibit.selected.empty.copy'), meta: emptyValue }];
  }

  return [
    { title: selected.name || t('alert.inhibit.default-title'), copy: selected.enable ? enabledText : disabledText, meta: t('alert.rule.selected.id-meta', { id: selected.id }) },
    { title: t('alert.inhibit.selected.source-target'), copy: `${Object.keys(selected.sourceLabels || {}).length} ${t('alert.inhibit.source')} · ${Object.keys(selected.targetLabels || {}).length} ${t('alert.inhibit.target')}`, meta: t('alert.inhibit.selected.label-selectors') },
    { title: t('alert.inhibit.selected.equal-labels'), copy: formatAlertInhibitEqualLabels(selected.equalLabels, emptyValue), meta: `${(selected.equalLabels || []).length} ${t('alert.inhibit.selected.shared-labels')}` }
  ];
}

export function buildAlertInhibitNoteRows(t: Translator) {
  return [
    { title: t('common.sorting'), copy: t('alert.rule.notes.sort-desc-copy'), meta: t('alert.inhibit.notes.query') },
    { title: t('common.search'), copy: t('alert.rule.notes.search-copy'), meta: t('common.behavior-preserved') }
  ];
}

export function validateAlertInhibitForm(draft: AlertInhibitFormDraft, t: Translator) {
  if (!draft.name.trim()) {
    return t('alert.inhibit.validation.name');
  }
  if (!draft.sourceLabelsText.trim()) {
    return t('alert.inhibit.validation.source');
  }
  if (!draft.targetLabelsText.trim()) {
    return t('alert.inhibit.validation.target');
  }
  if (!draft.equalLabelsText.trim()) {
    return t('alert.inhibit.validation.equal');
  }
  return null;
}
