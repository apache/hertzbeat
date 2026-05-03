import type { EntityDefinitionActivity, EntityDefinitionWorkspaceTemplate } from '@/lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export function buildDefinitionFacts(entityId: string, format: 'yaml' | 'json', activityCount: number, templateCount: number) {
  return [
    { label: 'Workspace', value: `entities/${entityId}/definition` },
    { label: 'Format', value: format },
    { label: 'Activities', value: String(activityCount) },
    { label: 'Templates', value: String(templateCount) }
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
