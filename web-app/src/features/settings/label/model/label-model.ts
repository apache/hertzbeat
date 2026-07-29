/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { buildMonitorListPath } from '@/shared/navigation/app-paths';
import { buildLabelDisplayName } from '@/shared/labels/label-display-model';
import type { PagedCollection } from '@/shared/pagination';

export { buildLabelDisplayName } from '@/shared/labels/label-display-model';

export const labelResourceName = 'labels' as const;

export type LabelActionCapabilities = {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

const labelReadRoles = new Set(['ADMIN', 'USER', 'GUEST']);
const labelWriteRoles = new Set(['ADMIN', 'USER']);

export function labelActionCapabilities(roles: readonly string[]): LabelActionCapabilities {
  return {
    canRead: roles.some(role => labelReadRoles.has(role)),
    canCreate: roles.some(role => labelWriteRoles.has(role)),
    canUpdate: roles.some(role => labelWriteRoles.has(role)),
    canDelete: roles.includes('ADMIN')
  };
}

export function labelCapabilitySignature(capabilities: LabelActionCapabilities) {
  return [capabilities.canRead, capabilities.canCreate, capabilities.canUpdate, capabilities.canDelete]
    .map(Number)
    .join(':');
}

export type LabelRecord = {
  id: number;
  name: string;
  tagValue?: string;
  description?: string;
  type?: number;
  creator?: string;
  modifier?: string;
  gmtCreate?: string;
  gmtUpdate?: string;
};

export type LabelEditorState = { value: Partial<LabelRecord>; isNew: true } | { value: LabelRecord; isNew: false };

export type LabelIdentity = Pick<LabelRecord, 'name'> & Partial<Pick<LabelRecord, 'id' | 'tagValue'>>;

export type LabelExpectedWrite = {
  id?: number;
  name: string;
  tagValue: string;
  description: string;
  type: number;
};

export type LabelPage = PagedCollection<LabelRecord>;

export class LabelContractError extends Error {
  readonly code: string = 'LABEL_RESPONSE_INVALID';

  constructor(message = 'Label response is invalid') {
    super(message);
    this.name = 'LabelContractError';
  }
}

/** A local request-contract failure proves that no Label transport was attempted. */
export class LabelRequestContractError extends LabelContractError {
  override readonly code = 'LABEL_REQUEST_INVALID';

  constructor(message = 'Label request is invalid') {
    super(message);
    this.name = 'LabelRequestContractError';
  }
}

export type LabelListState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'permission' }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | { kind: 'ready'; records: LabelRecord[]; total: number };

export function buildLabelMonitorPath(label: Pick<LabelRecord, 'name' | 'tagValue'>) {
  return buildMonitorListPath({ labels: buildLabelDisplayName(label) });
}

export function buildLabelExpectedWrite(
  label: Partial<LabelRecord>,
  operation: 'create' | 'update'
): LabelExpectedWrite {
  return {
    ...(operation === 'update' && label.id !== undefined ? { id: label.id } : {}),
    name: label.name?.trim() ?? '',
    tagValue: normalizeLabelText(label.tagValue),
    description: normalizeLabelText(label.description),
    type: operation === 'create' ? 1 : (label.type ?? 1)
  };
}

export function labelExpectedIdentity(expected: LabelExpectedWrite): LabelIdentity {
  return {
    ...(expected.id === undefined ? {} : { id: expected.id }),
    name: expected.name,
    tagValue: expected.tagValue
  };
}

export function labelRecordIdentity(record: Pick<LabelRecord, 'id' | 'name' | 'tagValue'>): LabelIdentity {
  return {
    id: record.id,
    name: record.name.trim(),
    tagValue: normalizeLabelText(record.tagValue)
  };
}

/** Verifies every client-owned field before a void Label write is considered committed. */
export function labelSaveConverged(expected: LabelExpectedWrite, canonical: LabelRecord) {
  return (
    (expected.id === undefined || canonical.id === expected.id) &&
    canonical.name.trim() === expected.name &&
    normalizeLabelText(canonical.tagValue) === expected.tagValue &&
    normalizeLabelText(canonical.description) === expected.description &&
    (canonical.type ?? 1) === expected.type
  );
}

export function labelTypeKey(type?: number) {
  if (type === 0) return 'labels.type.auto';
  if (type === 2) return 'labels.type.preset';
  return 'labels.type.user';
}

function normalizeLabelText(value?: string) {
  return value?.trim() ?? '';
}
