import { normalizeLocale } from '../i18n';
import { SUPPLEMENTAL_MESSAGES } from '../i18n-runtime-messages';

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
const NEW_TEMPLATE_COMMENT_KEY = 'setting.define.new-template.comment';
const NEW_TEMPLATE_FALLBACK_COMMENT =
  '# Please define a new monitoring type by writing YML content here, refer to the document: https://hertzbeat.apache.org/docs/advanced/extend-point ';

function resolveNewTemplateComment(lang = 'zh-CN') {
  const locale = normalizeLocale(lang);
  return (
    SUPPLEMENTAL_MESSAGES[locale]?.[NEW_TEMPLATE_COMMENT_KEY] ||
    SUPPLEMENTAL_MESSAGES['en-US']?.[NEW_TEMPLATE_COMMENT_KEY] ||
    NEW_TEMPLATE_FALLBACK_COMMENT
  );
}

function normalizeStartupLang(lang: string | null | undefined, fallback = 'zh-CN') {
  const normalized = (lang || fallback).trim().replace(/_/g, '-');
  return normalized || fallback;
}

export function buildNewTemplateDraft(lang = 'zh-CN') {
  const originalYaml = resolveNewTemplateComment(lang);
  return {
    yaml: `${originalYaml}\n\n\n\n\n`,
    originalYaml
  };
}

export function buildNewTemplateYaml(lang = 'zh-CN') {
  return buildNewTemplateDraft(lang).yaml;
}

export function readTemplateAppFromYaml(yaml: string) {
  const match = yaml.match(/^\s*app:\s*['"]?([^'"\s#]+)['"]?/m);
  return match?.[1]?.trim() || null;
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
