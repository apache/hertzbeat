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

import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '@/core/http/api-message';

import {
  LabelContractError,
  type LabelIdentity,
  type LabelPage,
  type LabelRecord
} from '../model/label-model';
import { parseLabelPage } from './label-schema';

export type LabelListRequest = { search: string; pageIndex: number; pageSize: number };

export type LabelPayload = {
  id?: number;
  name: string;
  tagValue: string;
  description: string;
  type: number;
};

export const maximumLabelCanonicalProofPages = 10;

export class LabelCanonicalProofLimitError extends LabelContractError {
  override readonly code = 'LABEL_CANONICAL_PROOF_LIMIT';

  constructor() {
    super(`Label canonical proof exceeds ${maximumLabelCanonicalProofPages} pages`);
    this.name = 'LabelCanonicalProofLimitError';
  }
}

export async function loadLabels(query: LabelListRequest) {
  const response = await apiMessageGet<unknown>(buildLabelListPath(query));
  return parseLabelPage(response, query);
}

export function saveLabel(label: Partial<LabelRecord>, isNew: boolean) {
  const payload = buildLabelPayload(label, isNew);
  return isNew ? apiMessagePost<void>('/api/label', payload) : apiMessagePut<void>('/api/label', payload);
}

export function deleteLabel(id: number) {
  return apiMessageDelete<void>(`/api/label?ids=${encodeURIComponent(id)}`);
}

export async function findCanonicalLabel(identity: LabelIdentity) {
  const expectedName = identity.name.trim();
  const expectedValue = normalizeLabelValue(identity.tagValue);
  if (!expectedName) throw new LabelContractError('Label canonical identity is invalid');

  const first = await loadLabels({ search: expectedName, pageIndex: 0, pageSize: 100 });
  assertBoundedProof(first.totalPages);
  const pages: LabelPage[] = [first];

  // POST and PUT return no entity. This bounded scan is compatibility proof,
  // not permission to follow arbitrary pagination supplied by the server.
  for (let pageIndex = 1; pageIndex < first.totalPages; pageIndex += 1) {
    const page = await loadLabels({ search: expectedName, pageIndex, pageSize: 100 });
    assertStableProofPage(page, first, pageIndex);
    pages.push(page);
  }

  const matches = pages.flatMap(page => page.content).filter(label => (
    (identity.id === undefined || label.id === identity.id)
    && label.name.trim() === expectedName
    && normalizeLabelValue(label.tagValue) === expectedValue
  ));
  if (matches.length > 1) throw new LabelContractError('Label canonical proof is ambiguous');
  return matches[0];
}

export function buildLabelListPath(query: LabelListRequest) {
  const params = new URLSearchParams({
    pageIndex: String(query.pageIndex),
    pageSize: String(query.pageSize)
  });
  if (query.search) params.set('search', query.search);
  return `/api/label?${params.toString()}`;
}

export function buildLabelPayload(label: Partial<LabelRecord>, isNew: boolean): LabelPayload {
  return {
    ...(!isNew && label.id ? { id: label.id } : {}),
    name: label.name?.trim() ?? '',
    tagValue: label.tagValue?.trim() ?? '',
    description: label.description?.trim() ?? '',
    type: isNew ? 1 : label.type ?? 1
  };
}

function assertBoundedProof(totalPages: number) {
  if (!Number.isSafeInteger(totalPages) || totalPages < 0
    || totalPages > maximumLabelCanonicalProofPages) {
    throw new LabelCanonicalProofLimitError();
  }
}

function assertStableProofPage(page: LabelPage, first: LabelPage, expectedPage: number) {
  assertBoundedProof(page.totalPages);
  if (page.number !== expectedPage
    || page.totalElements !== first.totalElements
    || page.totalPages !== first.totalPages
    || page.size !== first.size) {
    throw new LabelContractError('Label canonical page set changed during proof');
  }
}

function normalizeLabelValue(value?: string) {
  return value?.trim() ?? '';
}
