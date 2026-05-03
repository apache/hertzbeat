import type { Label, PageResult } from '@/lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export function buildLabelFacts(list: PageResult<Label>, t: Translator) {
  return [
    { label: t('common.workspace'), value: 'setting/labels' },
    { label: t('common.total'), value: String(list.totalElements || 0) },
    { label: t('common.current-page-count'), value: String(list.content?.length || 0) }
  ];
}

export function buildLabelMetrics(items: Label[], _t: Translator) {
  const autoCount = items.filter(item => item.type === 0).length;
  const userCount = items.filter(item => item.type === 1).length;
  const presetCount = items.filter(item => item.type === 2).length;

  return [
    { label: 'auto in page', value: String(autoCount) },
    { label: 'user in page', value: String(userCount), tone: userCount > 0 ? 'success' : undefined },
    { label: 'preset in page', value: String(presetCount), tone: presetCount > 0 ? 'warning' : undefined }
  ];
}

export function buildLabelDisplayName(item: Pick<Label, 'name' | 'tagValue'>) {
  return item.tagValue && item.tagValue.trim() ? `${item.name}:${item.tagValue.trim()}` : item.name;
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
