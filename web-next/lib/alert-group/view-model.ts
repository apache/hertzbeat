import type { AlertGroupConverge, PageResult } from '@/lib/types';
import {
  buildAlertRuleEvidenceCopy,
  buildAlertRuleEvidenceDraftName,
  buildAlertRuleEvidenceFallbackTarget,
  buildAlertRuleEvidenceTitle
} from '../alert-rule-evidence-copy';
import type { AlertGroupFormDraft } from './controller';
import {
  buildSignalAlertGroupKeys,
  buildSignalEntityContextRows,
  stripReturnLabelFromHref,
  type SignalEntityContextRow,
  type SignalRouteContext
} from '../signal-route-context';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type AlertGroupEvidenceContext = {
  signal: string;
  title: string;
  copy: string;
  groupLabelsText: string;
  returnHref?: string;
  rows: SignalEntityContextRow[];
  draftPatch: Partial<AlertGroupFormDraft>;
  groupPreview?: {
    title: string;
    copy: string;
    groupLabelsText: string;
  };
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

function formatAlertGroupLabels(labels: string[] | null | undefined, emptyValue: string) {
  const text = (labels || []).map(label => label.trim()).filter(Boolean).join(', ');
  return text || emptyValue;
}

function formatAlertGroupSeconds(value: number | null | undefined, t: Translator) {
  return t('common.duration.seconds', { value: value || 0 });
}

export function buildAlertGroupEvidenceContext(
  signal: string | null | undefined,
  context: SignalRouteContext,
  t: Translator
): AlertGroupEvidenceContext | null {
  const normalizedSignal = normalizeSignal(signal);
  const targetName = firstText(context.serviceName, context.entityName, context.entityId) || buildAlertRuleEvidenceFallbackTarget(t);
  const groupLabelsText = buildSignalAlertGroupKeys(normalizedSignal, context);
  const returnHref = stripReturnLabelFromHref(context.returnTo);
  const rows = buildSignalEntityContextRows(context, {}, t);
  if (!normalizedSignal && !groupLabelsText && !returnHref) {
    return null;
  }

  return {
    signal: normalizedSignal || 'context',
    title: buildAlertRuleEvidenceTitle('group', normalizedSignal, t),
    copy: buildAlertRuleEvidenceCopy('group', t),
    groupLabelsText,
    returnHref,
    rows,
    draftPatch: {
      name: buildAlertRuleEvidenceDraftName('group', normalizedSignal, targetName, t),
      groupLabelsText
    },
    groupPreview: groupLabelsText
      ? {
          title: t('alert.group.preview.title'),
          copy: t('alert.group.preview.copy'),
          groupLabelsText
        }
      : undefined
  };
}

export function buildAlertGroupFacts(list: PageResult<AlertGroupConverge>, t: Translator) {
  return [
    { label: t('alert.setting.fact.workspace'), value: 'alert/group' },
    { label: t('common.total'), value: String(list.totalElements || 0) },
    { label: t('common.current-page-count'), value: String(list.content?.length || 0) }
  ];
}

export function buildAlertGroupMetrics(items: AlertGroupConverge[], t: Translator) {
  const enabledCount = items.filter(item => item.enable).length;
  return [
    { label: t('alert.rule.metric.current-page-enabled'), value: String(enabledCount), tone: enabledCount > 0 ? 'success' : undefined },
    { label: t('alert.rule.metric.current-page-disabled'), value: String(Math.max(items.length - enabledCount, 0)), tone: items.length - enabledCount > 0 ? 'warning' : undefined },
    { label: t('alert.rule.metric.sample-rule'), value: items[0]?.name || t('common.none') }
  ];
}

export function buildAlertGroupRows(items: AlertGroupConverge[], t: Translator, formatTime: (value?: number | string | null) => string) {
  const enabledText = t('common.enabled');
  const disabledText = t('common.disabled');
  const emptyValue = t('common.none');
  return items.map(item => ({
    key: String(item.id),
    title: item.name || t('alert.group.default-title'),
    copy: `${item.enable ? enabledText : disabledText} · ${t('alert.group.labels')} ${formatAlertGroupLabels(item.groupLabels, emptyValue)}`,
    meta: `${t('alert.group.wait')} ${formatAlertGroupSeconds(item.groupWait, t)} · ${t('common.updated')} ${formatTime(item.gmtUpdate || item.gmtCreate || null)}`
  }));
}

export function buildAlertGroupSelectedRows(selected: AlertGroupConverge | null, t: Translator) {
  const enabledText = t('common.enabled');
  const disabledText = t('common.disabled');
  const emptyValue = t('common.none');
  if (!selected) {
    return [{ title: t('alert.group.selected.empty.title'), copy: t('alert.group.selected.empty.copy'), meta: emptyValue }];
  }

  return [
    { title: selected.name || t('alert.group.default-title'), copy: selected.enable ? enabledText : disabledText, meta: t('alert.rule.selected.id-meta', { id: selected.id }) },
    { title: t('alert.group.selected.labels'), copy: formatAlertGroupLabels(selected.groupLabels, emptyValue), meta: `${(selected.groupLabels || []).length} ${t('alert.group.labels')}` },
    { title: t('alert.group.selected.timers'), copy: `${t('alert.group.wait')} ${formatAlertGroupSeconds(selected.groupWait, t)} · ${t('alert.group.interval')} ${formatAlertGroupSeconds(selected.groupInterval, t)}`, meta: `${t('alert.group.repeat')} ${formatAlertGroupSeconds(selected.repeatInterval, t)}` }
  ];
}

export function buildAlertGroupNoteRows(t: Translator) {
  return [
    { title: t('common.sorting'), copy: t('alert.rule.notes.sort-desc-copy'), meta: t('alert.group.notes.query') },
    { title: t('common.search'), copy: t('alert.rule.notes.search-copy'), meta: t('common.behavior-preserved') }
  ];
}

export function buildAlertGroupFormDraft(group?: AlertGroupConverge | null, fallback: Partial<AlertGroupFormDraft> = {}): AlertGroupFormDraft {
  if (!group) {
    return {
      name: fallback.name || '',
      enable: fallback.enable ?? true,
      groupLabelsText: fallback.groupLabelsText || '',
      groupWait: fallback.groupWait || '30',
      groupInterval: fallback.groupInterval || '300',
      repeatInterval: fallback.repeatInterval || '14400'
    };
  }

  return {
    id: group?.id,
    name: group?.name || '',
    enable: group?.enable ?? true,
    groupLabelsText: (group?.groupLabels || []).join(', '),
    groupWait: String(group?.groupWait ?? 30),
    groupInterval: String(group?.groupInterval ?? 300),
    repeatInterval: String(group?.repeatInterval ?? 14400)
  };
}

export function validateAlertGroupForm(draft: AlertGroupFormDraft, t: Translator) {
  function isNonNegativeTimer(value: string) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0;
  }

  if (!draft.name.trim()) {
    return t('alert.group.validation.name');
  }
  if (!draft.groupLabelsText.trim()) {
    return t('alert.group.validation.labels');
  }
  if (!draft.groupWait.trim()) {
    return t('alert.group.validation.group-wait');
  }
  if (!draft.groupInterval.trim()) {
    return t('alert.group.validation.group-interval');
  }
  if (!draft.repeatInterval.trim()) {
    return t('alert.group.validation.repeat-interval');
  }
  if (!isNonNegativeTimer(draft.groupWait)) {
    return t('alert.group.validation.group-wait-non-negative');
  }
  if (!isNonNegativeTimer(draft.groupInterval)) {
    return t('alert.group.validation.group-interval-non-negative');
  }
  if (!isNonNegativeTimer(draft.repeatInterval)) {
    return t('alert.group.validation.repeat-interval-non-negative');
  }
  return null;
}
