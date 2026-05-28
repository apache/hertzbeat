import type { PageResult, Plugin } from '@/lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export function buildPluginFacts(list: PageResult<Plugin>, query: { search: string }, t: Translator) {
  return [
    { label: t('common.workspace'), value: 'setting/plugins' },
    { label: t('common.total'), value: String(list.totalElements || 0) },
    { label: t('common.current-page-count'), value: String(list.content?.length || 0) },
    { label: t('setting.plugins.fact.query'), value: query.search || t('setting.plugins.fact.query.all') }
  ];
}

export function buildPluginMetrics(items: Plugin[], t: Translator) {
  const enabledCount = items.filter(item => item.enableStatus).length;
  const disabledCount = items.filter(item => !item.enableStatus).length;
  const paramCount = items.reduce((sum, item) => sum + (item.paramCount || 0), 0);

  return [
    { label: t('setting.plugins.metric.enabled-page'), value: String(enabledCount), tone: enabledCount > 0 ? 'success' : undefined },
    { label: t('setting.plugins.metric.disabled-page'), value: String(disabledCount), tone: disabledCount > 0 ? 'warning' : undefined },
    { label: t('setting.plugins.metric.params-page'), value: String(paramCount) }
  ];
}

export function buildPluginRows(items: Plugin[], t: Translator) {
  return items.map(item => ({
    title: item.name,
    copy: item.items?.map(sub => sub.type).filter(Boolean).join(' · ') || t('setting.plugins.row.item-fallback'),
    meta: `${item.enableStatus ? t('common.enabled') : t('common.disabled')} · ${t('setting.plugins.row.params', {
      count: item.paramCount || 0
    })}`
  }));
}

export function buildPluginTableRows(items: Plugin[], t: Translator) {
  return items.map(item => ({
    key: String(item.id),
    name: item.name,
    typeLabels: item.items?.map(sub => sub.type).filter(Boolean) || [],
    statusLabel: item.enableStatus ? t('common.enabled') : t('common.disabled'),
    paramCount: item.paramCount ?? 0,
    canEditParams: item.paramCount !== 0
  }));
}
