/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { entityRoutePaths } from '@/shared/navigation/app-paths';
import type { EditableEntityDto } from './entity-editor-contract';
import { safeEntityListPath } from './entity-query';

export const entityImportFormats = ['yaml', 'json', 'curl'] as const;
export type EntityImportFormat = (typeof entityImportFormats)[number];
export type EntityImportRequest = { content: string; format?: EntityImportFormat };
export type EntityImportFailure = {
  kind: 'validation' | 'permission' | 'unavailable' | 'contract' | 'error';
  message?: string;
};
export type EntityImportDraft = {
  content: string;
  format: EntityImportFormat;
  preview?: EditableEntityDto[];
  previewedContent?: string;
  previewedFormat?: EntityImportFormat;
};
export const initialEntityImportDraft: EntityImportDraft = { content: '', format: 'yaml' };

export type EntityImportViewModel = {
  state: {
    draft: EntityImportDraft;
    preview?: EditableEntityDto[];
    previewing: boolean;
    confirming: boolean;
    confirmEnabled: boolean;
    failure?: EntityImportFailure;
    createdIds?: number[];
    returnTo: string;
  };
  actions: {
    changeContent: (content: string) => void;
    changeFormat: (format: EntityImportFormat) => void;
    preview: () => void;
    confirm: () => void;
    cancel: () => void;
  };
};

export function changeEntityImportContent(draft: EntityImportDraft, content: string): EntityImportDraft {
  return { content, format: draft.format };
}

export function changeEntityImportFormat(draft: EntityImportDraft, format: EntityImportFormat): EntityImportDraft {
  return { content: draft.content, format };
}

export function previewedEntityImport(draft: EntityImportDraft, preview: EditableEntityDto[]): EntityImportDraft {
  return {
    content: draft.content,
    format: draft.format,
    preview,
    previewedContent: draft.content,
    previewedFormat: draft.format
  };
}

export function canConfirmEntityImport(draft: EntityImportDraft) {
  return Boolean(
    draft.content.trim() &&
    draft.preview?.length &&
    draft.previewedContent === draft.content &&
    draft.previewedFormat === draft.format
  );
}

export function entityImportRequest(draft: EntityImportDraft): EntityImportRequest {
  return { content: draft.content, format: draft.format };
}

export function safeEntityImportReturnTo(value?: string | null) {
  return safeEntityListPath(value);
}

export function buildEntityImportPath(returnTo: string) {
  return `${entityRoutePaths.import}?returnTo=${encodeURIComponent(safeEntityImportReturnTo(returnTo))}`;
}
