type ApiGetter = <T>(url: string) => Promise<T>;
type ApiPoster = <T>(url: string, payload: unknown) => Promise<T>;
type ApiPutter = <T>(url: string, payload: unknown) => Promise<T>;
type ApiDeleter = <T>(url: string) => Promise<T>;

export interface TemplateHierarchyItem {
  category?: string | null;
  value?: string | null;
  label?: string | null;
  hide?: boolean | null;
  children?: TemplateHierarchyItem[] | null;
}

export interface TemplateMenuItem {
  category: string;
  value: string;
  label: string;
  hide: boolean;
}

export interface TemplateMenuGroup {
  key: string;
  label: string;
  items: TemplateMenuItem[];
}

export interface SettingDefinePageData {
  menuGroups: TemplateMenuGroup[];
  appLabels: Record<string, string>;
  selectedApp: string | null;
  yaml: string;
  originalYaml: string;
}

const FILTERED_TEMPLATE_VALUES = new Set(['prometheus']);
const FILTERED_TEMPLATE_CATEGORIES = new Set(['__system__']);
const NEW_TEMPLATE_CODE_BY_LOCALE: Record<string, string> = {
  'zh-CN': '# 请在此通过编写YML内容来定义新的监控类型, 参考文档: https://hertzbeat.apache.org/docs/advanced/extend-point ',
  'en-US': '# Please define a new monitoring type by writing YML content here, refer to the document: https://hertzbeat.apache.org/docs/advanced/extend-point '
};

function normalizeDraftLocale(lang = 'zh-CN') {
  return lang.toLowerCase().startsWith('en') ? 'en-US' : 'zh-CN';
}

function normalizeStartupLang(lang: string | null | undefined, fallback = 'zh-CN') {
  const normalized = (lang || fallback).trim().replace(/_/g, '-');
  return normalized || fallback;
}

export function buildNewTemplateDraft(lang = 'zh-CN') {
  const originalYaml = NEW_TEMPLATE_CODE_BY_LOCALE[normalizeDraftLocale(lang)];
  return {
    yaml: `${originalYaml}\n\n\n\n\n`,
    originalYaml
  };
}

export function buildNewTemplateYaml(lang = 'zh-CN') {
  return buildNewTemplateDraft(lang).yaml;
}

function normalizeTemplateItem(item: TemplateHierarchyItem): TemplateMenuItem | null {
  const value = (item.value || '').trim();
  const category = (item.category || '').trim();
  if (!value || !category) return null;
  if (FILTERED_TEMPLATE_VALUES.has(value) || FILTERED_TEMPLATE_CATEGORIES.has(category)) return null;
  return {
    category,
    value,
    label: (item.label || value).trim(),
    hide: item.hide !== false
  };
}

export function buildTemplateMenuGroups(items: TemplateHierarchyItem[]): TemplateMenuGroup[] {
  const groups = new Map<string, TemplateMenuItem[]>();

  for (const raw of items) {
    const item = normalizeTemplateItem(raw);
    if (!item) continue;
    const group = groups.get(item.category) || [];
    group.push(item);
    groups.set(item.category, group);
  }

  return Array.from(groups.entries())
    .map(([key, groupItems]) => ({
      key,
      label: key.toUpperCase(),
      items: groupItems
    }));
}

export async function loadDefineCenterData(apiGet: ApiGetter, app: string | null | undefined, lang = 'zh-CN'): Promise<SettingDefinePageData> {
  const selectedApp = app?.trim() || null;
  const hierarchy = await apiGet<TemplateHierarchyItem[]>(`/apps/hierarchy?lang=${encodeURIComponent(lang)}`);
  const menuGroups = buildTemplateMenuGroups(hierarchy || []);
  const appLabels = Object.fromEntries(menuGroups.flatMap(group => group.items.map(item => [item.value, item.label])));
  const draft = selectedApp ? null : buildNewTemplateDraft(lang);
  const yaml = selectedApp ? await apiGet<string>(`/apps/${encodeURIComponent(selectedApp)}/define/yml`) : draft?.yaml || '';

  return {
    menuGroups,
    appLabels,
    selectedApp,
    yaml,
    originalYaml: selectedApp ? yaml : draft?.originalYaml || ''
  };
}

export async function saveTemplateDefine(apiPost: ApiPoster, apiPut: ApiPutter, yaml: string, isNew: boolean) {
  const payload = { define: yaml };
  if (isNew) {
    return apiPost<void>('/apps/define/yml', payload);
  }
  return apiPut<void>('/apps/define/yml', payload);
}

export async function deleteTemplateDefine(apiDelete: ApiDeleter, app: string) {
  return apiDelete<void>(`/apps/${encodeURIComponent(app)}/define/yml`);
}

export async function updateTemplateVisibility(apiPut: ApiPutter, app: string, hide: boolean) {
  return apiPut<void>(`/config/template/${encodeURIComponent(app)}`, { hide });
}

export async function reloadTemplateDefinitionStartupContext(apiGet: ApiGetter, lang = 'zh-CN') {
  let startupLang = normalizeStartupLang(lang);
  try {
    const systemConfig = await apiGet<{ locale?: string | null }>('/config/system');
    startupLang = normalizeStartupLang(systemConfig?.locale, startupLang);
  } catch {
    startupLang = normalizeStartupLang(startupLang);
  }
  await apiGet<TemplateHierarchyItem[]>(`/apps/hierarchy?lang=${encodeURIComponent(startupLang)}`);
}
