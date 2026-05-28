import type { SettingDefinePageData, TemplateMenuGroup } from './controller';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export interface TemplateMenuRow {
  key: string;
  title: string;
  copy: string;
  meta: string;
  app: string;
  hidden: boolean;
}

export interface TemplateMenuGroupView {
  key: string;
  label: string;
  rows: TemplateMenuRow[];
}

function allItems(groups: TemplateMenuGroup[]) {
  return groups.flatMap(group => group.items);
}

function matchesSearch(value: string, search: string) {
  return value.toLocaleLowerCase().includes(search.toLocaleLowerCase());
}

function formatVisibility(hidden: boolean, t: Translator) {
  return hidden ? t('setting.define.template.hidden') : t('setting.define.template.visible');
}

function formatCategoryLabel(group: TemplateMenuGroup, t: Translator) {
  const key = `menu.monitor.${group.key}`;
  const translated = t(key);
  return translated && translated !== key ? translated : group.label;
}

function readAppFromYaml(yaml: string) {
  const match = yaml.match(/^\s*app:\s*([^\s#]+)/m);
  return match?.[1]?.trim() || 'custom';
}

export function buildTemplateFacts(data: SettingDefinePageData, t: Translator) {
  const items = allItems(data.menuGroups);
  const selectedLabel = data.selectedApp ? data.appLabels[data.selectedApp] || data.selectedApp : t('setting.define.new-template');

  return [
    { label: t('common.workspace'), value: 'setting/define' },
    { label: t('common.total'), value: String(items.length) },
    { label: t('setting.define.fact.selected-template'), value: selectedLabel },
    { label: t('setting.define.fact.hidden'), value: String(items.filter(item => item.hide).length) }
  ];
}

export function buildTemplateMenuView(groups: TemplateMenuGroup[], search: string, t: Translator): TemplateMenuGroupView[] {
  const normalizedSearch = search.trim();

  return groups
    .map(group => {
      const rows = group.items
        .filter(item => {
          if (!normalizedSearch) return true;
          return matchesSearch(item.label, normalizedSearch);
        })
        .map(item => ({
          key: item.value,
          title: item.label || item.value,
          copy: `${item.category} · ${item.value}`,
          meta: formatVisibility(item.hide, t),
          app: item.value,
          hidden: item.hide
        }));

      return { key: group.key, label: formatCategoryLabel(group, t), rows };
    })
    .filter(group => group.rows.length > 0);
}

export function buildTemplateSummaryRows(selectedApp: string | null, yaml: string, t: Translator, selectedLabel?: string | null) {
  const app = selectedApp || readAppFromYaml(yaml);
  const lineCount = yaml.split(/\r?\n/).filter(line => line.length > 0).length;

  return [
    {
      title: selectedApp ? selectedLabel || selectedApp : t('setting.define.new-template'),
      copy: `app-${app}.yml`,
      meta: selectedApp ? t('setting.define.summary.mode.edit') : t('setting.define.summary.mode.new')
    },
    {
      title: 'YAML',
      copy: t('setting.define.summary.yaml-lines', { count: lineCount }),
      meta: 'setting/define'
    }
  ];
}
