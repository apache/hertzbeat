/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { entityRoutePaths } from '@/shared/navigation/app-paths';
import type { EditableEntityDto } from './entity-editor-contract';
import { safeEntityListPath } from './entity-query';

export const entityImportFormats = ['yaml', 'json', 'curl'] as const;
export type EntityImportFormat = (typeof entityImportFormats)[number];
export type EntityImportRequest = { content: string; format?: EntityImportFormat };
export type EntityImportFailure = {
  kind: 'validation' | 'permission' | 'unavailable' | 'contract' | 'error';
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
    canWrite: boolean;
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

export function isEntityImportDirty(draft: EntityImportDraft) {
  return draft.content !== initialEntityImportDraft.content || draft.format !== initialEntityImportDraft.format;
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

export function buildEntityImportDetailPath(id: number, returnTo: string) {
  const detailPath = entityRoutePaths.detail.replace(':entityId', String(id));
  return `${detailPath}?returnTo=${encodeURIComponent(safeEntityImportReturnTo(returnTo))}`;
}
