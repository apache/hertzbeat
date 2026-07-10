import type { Bulletin, BulletinMetric, BulletinMetricsData, BulletinMetricsRow, PageResult } from '@/lib/types';
import type { WorkspaceShellTab } from '@/components/workbench/workspace-tab-strip';
import type { BulletinFormDraft } from './controller';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

const BULLETIN_REFRESH_PRESETS = [10, 30, 60, 300, -1] as const;

function formatBulletinFact(value: string | number | null | undefined, emptyValue: string) {
  const text = value == null ? '' : String(value).trim();
  return text || emptyValue;
}

export function buildBulletinFacts(list: PageResult<Bulletin>, selected: Bulletin | null, t: Translator) {
  const emptyValue = t('common.none');

  return [
    { label: t('common.workspace'), value: t('bulletin.facts.workspace') },
    { label: t('common.total'), value: String(list.totalElements || 0) },
    { label: t('common.current-page-count'), value: String(list.content?.length || 0) },
    { label: t('bulletin.facts.selected'), value: formatBulletinFact(selected?.name, emptyValue) }
  ];
}

export function buildBulletinRows(items: Bulletin[], t: Translator, formatTime: (value?: number | string | null) => string) {
  const emptyValue = t('common.none');

  return items.map(item => {
    const rowTitle = formatBulletinFact(item.name, emptyValue);

    return {
      key: String(item.id),
      title: rowTitle,
      copy: `${formatBulletinFact(item.app, emptyValue)} · ${t('bulletin.list.monitors')} ${(item.monitorIds || []).length}`,
      meta: `${formatTime(item.gmtUpdate || item.gmtCreate || null)} · ${t('bulletin.list.creator')} ${formatBulletinFact(item.creator, emptyValue)}`
    };
  });
}

export function buildBulletinSelectionRows(selected: Bulletin | null, t: Translator, formatTime: (value?: number | string | null) => string) {
  const emptyValue = t('common.none');

  if (!selected) {
    return [{ title: t('bulletin.selected.empty.title'), copy: t('bulletin.selected.empty.copy'), meta: emptyValue }];
  }

  const selectedTitle = formatBulletinFact(selected.name, emptyValue);

  return [
    {
      title: selectedTitle,
      copy: `${formatBulletinFact(selected.app, emptyValue)} · ${t('bulletin.list.monitors')} ${(selected.monitorIds || []).length}`,
      meta: `id ${selected.id}`
    },
    {
      title: t('bulletin.selected.fields'),
      copy: String(Object.keys(selected.fields || {}).length),
      meta: `${t('common.updated')} ${formatTime(selected.gmtUpdate || selected.gmtCreate || null)}`
    }
  ];
}

export function pickSelectedBulletin(items: Bulletin[], selectedId: number | null) {
  return items.find(item => item.id === selectedId) ?? items[0] ?? null;
}

export function buildBulletinCurrentQueryLabel(query: string, t: Translator) {
  return query.trim() || t('bulletin.search.all');
}

export function buildBulletinTabs(items: Bulletin[], selectedId: number | null): WorkspaceShellTab[] {
  return items.map(item => ({
    key: String(item.id),
    label: item.name,
    active: item.id === pickSelectedBulletin(items, selectedId)?.id
  }));
}

export function buildSelectedBulletinJson(selected: Bulletin | null) {
  return selected ? JSON.stringify(selected, null, 2) : null;
}

export function buildBulletinMetricsState(metricsData: BulletinMetricsData | null, metricsError: string | null, t: Translator) {
  if (metricsData) {
    return {
      kind: 'data' as const,
      content: JSON.stringify(metricsData, null, 2)
    };
  }

  return {
    kind: 'empty' as const,
    title: metricsError ? t('bulletin.metrics.error.title') : t('bulletin.metrics.empty.title'),
    copy: metricsError || t('bulletin.metrics.empty.copy'),
    tone: metricsError ? 'danger' as const : 'default' as const
  };
}

export function buildBulletinRefreshLabel(refreshSeconds: number, countDownTime: number, t: Translator) {
  if (refreshSeconds <= 0) {
    return t('monitor.detail.close-refresh');
  }
  return t('monitor.detail.auto-refresh', { time: countDownTime });
}

export function buildBulletinRefreshPresets(selectedSeconds: number, t: Translator) {
  return BULLETIN_REFRESH_PRESETS.map(value => ({
    value,
    active: value === selectedSeconds,
    label: value > 0 ? t('monitor.detail.config-refresh', { time: value }) : t('monitor.detail.close-refresh')
  }));
}

function translateMetricName(app: string, metricName: string, t: Translator) {
  const translated = t(`monitor.app.${app}.metrics.${metricName}`);
  return translated === `monitor.app.${app}.metrics.${metricName}` ? metricName : translated;
}

function translateMetricField(app: string, metricName: string, fieldKey: string, t: Translator) {
  const translated = t(`monitor.app.${app}.metrics.${metricName}.metric.${fieldKey}`);
  return translated === `monitor.app.${app}.metrics.${metricName}.metric.${fieldKey}` ? fieldKey : translated;
}

export function buildBulletinMetricColumns(data: BulletinMetricsData | null, app: string, t: Translator) {
  if (!data) {
    return [];
  }

  const metricMap = new Map<
    string,
    {
      key: string;
      label: string;
      fieldOrder: string[];
      fieldLabelMap: Map<string, string>;
    }
  >();

  data.content.forEach(row => {
    row.metrics.forEach(metric => {
      const existing =
        metricMap.get(metric.name) ??
        {
          key: metric.name,
          label: translateMetricName(app, metric.name, t),
          fieldOrder: [],
          fieldLabelMap: new Map<string, string>()
        };

      metric.fields.forEach(fieldGroup => {
        fieldGroup.forEach(field => {
          if (!existing.fieldLabelMap.has(field.key)) {
            existing.fieldOrder.push(field.key);
            existing.fieldLabelMap.set(field.key, translateMetricField(app, metric.name, field.key, t));
          }
        });
      });

      metricMap.set(metric.name, existing);
    });
  });

  return Array.from(metricMap.values()).map(metric => ({
    key: metric.key,
    label: metric.label,
    fields: metric.fieldOrder.map(fieldKey => ({
      key: fieldKey,
      label: metric.fieldLabelMap.get(fieldKey) || fieldKey
    }))
  }));
}

function findMetric(row: BulletinMetricsRow, metricName: string): BulletinMetric | null {
  return row.metrics.find(metric => metric.name === metricName) ?? null;
}

export function buildBulletinMetricCellValues(row: BulletinMetricsRow, metricName: string, fieldKey: string) {
  const metric = findMetric(row, metricName);
  if (!metric) {
    return [];
  }

  return metric.fields
    .flatMap(group => group.filter(field => field.key === fieldKey))
    .map(field => ({
      value: field.value || '',
      unit: field.unit || '',
      isNoData: field.value === 'NO_DATA'
    }));
}

export function buildBulletinFormDraft(selected?: Bulletin | null): BulletinFormDraft {
  return {
    id: selected?.id,
    name: selected?.name || '',
    app: selected?.app || '',
    monitorIdsText: (selected?.monitorIds || []).join(', '),
    fieldsJson: JSON.stringify(selected?.fields || {}, null, 2)
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function validateBulletinForm(draft: BulletinFormDraft, t: Translator) {
  if (!draft.name.trim()) {
    return t('bulletin.validation.name');
  }
  if (!draft.app.trim()) {
    return t('bulletin.validation.app');
  }
  if (!draft.monitorIdsText.trim()) {
    return t('bulletin.validation.monitors');
  }
  let fields: unknown;
  try {
    fields = JSON.parse(draft.fieldsJson || '{}');
  } catch {
    return t('bulletin.validation.fields');
  }
  if (!isPlainObject(fields)) {
    return t('bulletin.validation.fields');
  }
  if (Object.keys(fields).length === 0) {
    return t('bulletin.validation.fields-empty');
  }
  return null;
}
