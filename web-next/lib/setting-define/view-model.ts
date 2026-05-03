import type { AlertDefine, PageResult } from '@/lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

const DEFINE_TYPE_COPY: Record<string, { key: string; zh: string }> = {
  realtime_metric: { key: 'alert.setting.type.realtime.metric', zh: '指标实时' },
  periodic_metric: { key: 'alert.setting.type.periodic.metric', zh: '指标周期' },
  realtime_log: { key: 'alert.setting.type.realtime.log', zh: '日志实时' },
  periodic_log: { key: 'alert.setting.type.periodic.log', zh: '日志周期' },
  periodic_trace: { key: 'alert.setting.type.periodic.trace', zh: '链路周期' }
};

function hasChineseCopy(t: Translator) {
  return t('common.workspace') === '工作区' || t('menu.advanced.define') === '定义';
}

function resolveCopy(t: Translator, key: string, fallback: string) {
  const value = t(key);
  return value && value !== key ? value : fallback;
}

function formatDefineType(type: string | null | undefined, t: Translator) {
  if (!type) return '-';
  const copy = DEFINE_TYPE_COPY[type];
  if (!copy) return type;
  const translated = t(copy.key);
  if (translated && translated !== copy.key) return translated;
  return hasChineseCopy(t) ? copy.zh : type;
}

function formatEnableState(enabled: boolean | undefined, t: Translator) {
  if (hasChineseCopy(t)) {
    return enabled ? '已启用' : '已停用';
  }
  return enabled ? resolveCopy(t, 'common.enabled', 'enabled') : resolveCopy(t, 'common.disabled', 'disabled');
}

function formatDatasourceHealth(code: number, t: Translator) {
  if (hasChineseCopy(t)) {
    return code === 0 ? '就绪' : '关注';
  }
  return code === 0 ? resolveCopy(t, 'common.ready', 'ready') : resolveCopy(t, 'common.attention', 'attention');
}

export function buildDefineFacts(list: PageResult<AlertDefine>, datasourceStatus: { code: number }, t: Translator) {
  return [
    { label: t('common.workspace'), value: 'setting/define' },
    { label: t('common.total'), value: String(list.totalElements || 0) },
    { label: t('common.current-page-count'), value: String(list.content?.length || 0) },
    { label: hasChineseCopy(t) ? '数据源' : 'Datasource', value: formatDatasourceHealth(datasourceStatus.code, t) }
  ];
}

export function buildDefineRows(items: AlertDefine[], t: Translator, formatTime: (value?: number | string | null) => string) {
  const chineseCopy = hasChineseCopy(t);
  return items.map(item => ({
    key: String(item.id),
    title: item.name || resolveCopy(t, 'setting.define.item.fallback', chineseCopy ? '未命名定义' : 'Unnamed define'),
    copy: `${formatDefineType(item.type, t)} · ${item.datasource || '-'} · ${formatEnableState(item.enable, t)}`,
    meta: chineseCopy
      ? `周期 ${item.period || 0} 秒 · 更新 ${formatTime(item.gmtUpdate || item.gmtCreate || null)}`
      : `period ${item.period || 0}s · updated ${formatTime(item.gmtUpdate || item.gmtCreate || null)}`
  }));
}

export function buildPreviewRows(selected: AlertDefine | null, t: Translator) {
  if (!selected) {
    const chineseCopy = hasChineseCopy(t);
    return [
      {
        title: resolveCopy(t, 'setting.define.empty-selected.title', chineseCopy ? '未选择定义' : 'No definition selected'),
        copy: resolveCopy(t, 'setting.define.empty-selected.copy', chineseCopy ? '从左侧列表选择一条定义。' : 'Select a definition from the list.'),
        meta: '-'
      }
    ];
  }

  return [
    {
      title: selected.name || resolveCopy(t, 'setting.define.item.fallback', hasChineseCopy(t) ? '未命名定义' : 'Unnamed define'),
      copy: selected.expr || '-',
      meta: `${selected.datasource || '-'} · ${formatDefineType(selected.type, t)}`
    }
  ];
}
