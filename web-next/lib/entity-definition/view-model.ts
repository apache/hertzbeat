import type { EntityDefinitionActivity, EntityDefinitionWorkspaceTemplate } from '@/lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export function buildDefinitionFacts(entityId: string, format: 'yaml' | 'json', activityCount: number, templateCount: number, t: Translator) {
  return [
    { label: t('entities.definition.workspace.fact.workspace'), value: `entities/${entityId}/definition` },
    { label: t('entities.definition.workspace.fact.format'), value: format },
    { label: t('entities.definition.workspace.fact.activities'), value: String(activityCount) },
    { label: t('entities.definition.workspace.fact.templates'), value: String(templateCount) }
  ];
}

export function buildDefinitionActivityRows(items: EntityDefinitionActivity[]) {
  return items.map(item => ({
    title: item.summary,
    copy: item.detail || item.activityType,
    meta: `${item.status} · ${item.format || '-'}`
  }));
}

export function buildTemplateReferenceRows(items: EntityDefinitionWorkspaceTemplate[]) {
  return items.map(item => ({
    key: String(item.id),
    title: item.name,
    copy: item.summary || item.kind || '-',
    meta: `${item.format} · ${item.source || '-'}`
  }));
}
