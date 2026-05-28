import type { Label, PageResult } from '@/lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

const ANGULAR_LABEL_COLORS = ['blue', 'green', 'orange', 'purple', 'cyan', 'yellow', 'pink', 'lime', 'red', 'geekblue', 'volcano', 'magenta'] as const;

export type AngularLabelColor = (typeof ANGULAR_LABEL_COLORS)[number];

export function buildLabelFacts(list: PageResult<Label>, t: Translator) {
  return [
    { label: t('common.workspace'), value: 'setting/labels' },
    { label: t('common.total'), value: String(list.totalElements || 0) },
    { label: t('common.current-page-count'), value: String(list.content?.length || 0) }
  ];
}

export function buildLabelMetrics(items: Label[], t: Translator) {
  const autoCount = items.filter(item => item.type === 0).length;
  const userCount = items.filter(item => item.type === 1).length;
  const presetCount = items.filter(item => item.type === 2).length;

  return [
    { label: t('setting.labels.metric.auto-page'), value: String(autoCount) },
    { label: t('setting.labels.metric.user-page'), value: String(userCount), tone: userCount > 0 ? 'success' : undefined },
    { label: t('setting.labels.metric.preset-page'), value: String(presetCount), tone: presetCount > 0 ? 'warning' : undefined }
  ];
}

export function buildLabelDisplayName(item: Pick<Label, 'name' | 'tagValue'>) {
  const name = item.name ?? '';
  return item.tagValue && item.tagValue.trim() ? `${name}:${item.tagValue}` : name;
}

export function renderAngularLabelColor(key = ''): AngularLabelColor {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    const char = key.charCodeAt(index);
    hash = (hash << 5) - hash + char;
    hash &= hash;
  }
  return ANGULAR_LABEL_COLORS[Math.abs(hash) % ANGULAR_LABEL_COLORS.length];
}

export function buildLabelCards(items: Label[], labelTypeLabel: (type?: number | null) => string, formatTime: (value?: number | string | null) => string) {
  return items.map(item => {
    const displayName = buildLabelDisplayName(item);

    return {
      key: String(item.id),
      displayName,
      description: item.description || '-',
      meta: `${labelTypeLabel(item.type)} · ${formatTime(item.gmtUpdate || item.gmtCreate || null)}`,
      href: `/monitors?labels=${encodeURIComponent(displayName)}`
    };
  });
}

export function buildLabelRows(items: Label[], labelTypeLabel: (type?: number | null) => string, formatTime: (value?: number | string | null) => string) {
  return items.map(item => ({
    title: buildLabelDisplayName(item),
    copy: item.description || '-',
    meta: `${labelTypeLabel(item.type)} · ${formatTime(item.gmtUpdate || item.gmtCreate || null)}`
  }));
}
