/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { entityRoutePaths } from '@/shared/navigation/app-paths';
import type { EditableEntityDto } from './entity-editor-contract';
import { safeEntityListPath } from './entity-query';

export const entityDefinitionFormats = ['yaml', 'json'] as const;
export type EntityDefinitionFormat = (typeof entityDefinitionFormats)[number];
export type EntityDefinitionRequest = { content: string; format: EntityDefinitionFormat };
export type EntityDefinitionFailure = {
  kind: 'missing' | 'permission' | 'validation' | 'unavailable' | 'contract' | 'error';
};
export type EntityDefinitionDraft = {
  routeId: number;
  format: EntityDefinitionFormat;
  canonical: string;
  content: string;
  preview?: EditableEntityDto;
  previewedContent?: string;
  previewedFormat?: EntityDefinitionFormat;
};
type EntityDefinitionEvidence =
  | { kind: 'loading' | 'missing' | 'permission' | 'unavailable' | 'contract' | 'error' }
  | { kind: 'ready'; resource: EditableEntityDto };
export type EntityDefinitionViewModel = {
  state: {
    evidence: EntityDefinitionEvidence;
    format: EntityDefinitionFormat;
    content: string;
    dirty: boolean;
    preview?: EditableEntityDto;
    previewing: boolean;
    saving: boolean;
    refreshing: boolean;
    saveEnabled: boolean;
    canWrite: boolean;
    failure?: EntityDefinitionFailure;
    refreshFailure?: EntityDefinitionFailure;
    saved: boolean;
  };
  actions: {
    changeContent: (content: string) => void;
    changeFormat: (format: EntityDefinitionFormat) => void;
    reset: () => void;
    preview: () => void;
    save: () => void;
    retry: () => void;
    back: () => void;
  };
};

export function resetEntityDefinitionDraft(
  routeId: number,
  format: EntityDefinitionFormat,
  canonical: string
): EntityDefinitionDraft {
  return { routeId, format, canonical, content: canonical };
}

export function currentEntityDefinitionDraft(
  edited: { source: string; draft: EntityDefinitionDraft } | undefined,
  source: string,
  id: number | undefined,
  format: EntityDefinitionFormat,
  canonical: string | undefined
) {
  if (edited?.source === source) return edited.draft;
  return id !== undefined && canonical !== undefined ? resetEntityDefinitionDraft(id, format, canonical) : undefined;
}

export function changeEntityDefinitionContent(draft: EntityDefinitionDraft, content: string): EntityDefinitionDraft {
  return { routeId: draft.routeId, format: draft.format, canonical: draft.canonical, content };
}

export function previewedEntityDefinition(
  draft: EntityDefinitionDraft,
  preview: EditableEntityDto
): EntityDefinitionDraft {
  return { ...draft, preview, previewedContent: draft.content, previewedFormat: draft.format };
}

export function canSaveEntityDefinition(draft: EntityDefinitionDraft | undefined, routeId: number | undefined) {
  return Boolean(
    draft &&
    routeId === draft.routeId &&
    draft.content.trim() &&
    draft.preview &&
    draft.previewedContent === draft.content &&
    draft.previewedFormat === draft.format
  );
}

export function parseEntityDefinitionId(value: string | undefined) {
  if (!value || !/^[1-9]\d*$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export function safeEntityDefinitionReturnTo(id: number, value?: string | null) {
  const detail = entityRoutePaths.detail.replace(':entityId', String(id));
  if (!value?.startsWith('/')) return detail;
  const url = new URL(value, 'https://hertzbeat.local');
  if (url.pathname !== detail) return detail;
  const listReturnTo = safeEntityListPath(url.searchParams.get('returnTo'));
  return url.searchParams.has('returnTo') ? `${detail}?returnTo=${encodeURIComponent(listReturnTo)}` : detail;
}

export function buildEntityDefinitionRoute(id: number, listReturnTo: string | null) {
  const detail = entityRoutePaths.detail.replace(':entityId', String(id));
  const safeList = safeEntityListPath(listReturnTo);
  const back = `${detail}?returnTo=${encodeURIComponent(safeList)}`;
  return `${entityRoutePaths.definition.replace(':entityId', String(id))}?returnTo=${encodeURIComponent(back)}`;
}
