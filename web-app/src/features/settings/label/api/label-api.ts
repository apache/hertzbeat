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
import { buildLabelDisplayName } from '@/shared/labels/label-display-model';
import type { LabelDrilldownCatalog } from '@/shared/labels/label-suggestion-model';

import {
  LabelContractError,
  LabelRequestContractError,
  type LabelIdentity,
  type LabelPage,
  type LabelRecord
} from '../model/label-model';
import { labelApiRequest, LabelTransportFailure } from './label-api-failure';
import { parseLabelPage, parseLabelWriteReceipt } from './label-schema';

export type LabelListRequest = { search: string; pageIndex: number; pageSize: number };

export const labelEndpoint = '/api/label';

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

export async function loadLabels(query: LabelListRequest, signal?: AbortSignal) {
  validateListRequest(query);
  const response = await labelApiRequest(() =>
    signal ? apiMessageGet(buildLabelListPath(query), { signal }) : apiMessageGet(buildLabelListPath(query))
  );
  return parseLabelPage(response, query);
}

export async function loadLabelSuggestions(signal?: AbortSignal): Promise<LabelDrilldownCatalog> {
  const request = { search: '', pageIndex: 0, pageSize: 100 };
  const first = await loadLabels(request, signal);
  assertBoundedProof(first.totalPages);
  const pages: LabelPage[] = [
    first,
    ...(await Promise.all(
      Array.from({ length: Math.max(0, first.totalPages - 1) }, async (_, offset) => {
        const pageIndex = offset + 1;
        const page = await loadLabels({ ...request, pageIndex }, signal);
        assertStableProofPage(page, first, pageIndex);
        return page;
      })
    ))
  ];
  return buildLabelSuggestionCatalog(pages.flatMap(page => page.content));
}

export async function saveLabel(label: Partial<LabelRecord>, isNew: boolean) {
  const payload = buildLabelPayload(label, isNew);
  const receipt = await labelApiRequest(() =>
    isNew ? apiMessagePost(labelEndpoint, payload) : apiMessagePut(labelEndpoint, payload)
  );
  return parseLabelWriteReceipt(receipt);
}

export async function deleteLabel(id: number) {
  if (!positiveSafeInteger(id)) throw new LabelRequestContractError('Label id is invalid');
  const receipt = await labelApiRequest(() => apiMessageDelete(`${labelEndpoint}?ids=${encodeURIComponent(id)}`));
  return parseLabelWriteReceipt(receipt);
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

  const matches = pages
    .flatMap(page => page.content)
    .filter(
      label =>
        (identity.id === undefined || label.id === identity.id) &&
        label.name.trim() === expectedName &&
        normalizeLabelValue(label.tagValue) === expectedValue
    );
  if (matches.length > 1) throw new LabelContractError('Label canonical proof is ambiguous');
  return matches[0];
}

function buildLabelListPath(query: LabelListRequest) {
  const params = new URLSearchParams({
    pageIndex: String(query.pageIndex),
    pageSize: String(query.pageSize)
  });
  const search = query.search.trim();
  if (search) params.set('search', search);
  return `${labelEndpoint}?${params.toString()}`;
}

export function buildLabelPayload(label: Partial<LabelRecord>, isNew: boolean): LabelPayload {
  const payload = {
    ...(!isNew && label.id !== undefined ? { id: label.id } : {}),
    name: label.name?.trim() ?? '',
    tagValue: label.tagValue?.trim() ?? '',
    description: label.description?.trim() ?? '',
    type: isNew ? 1 : (label.type ?? 1)
  };
  if (!validLabelPayload(payload, isNew)) throw new LabelRequestContractError('Label write request is invalid');
  return payload;
}

function validLabelPayload(payload: LabelPayload, isNew: boolean) {
  const checks = [
    Boolean(payload.name),
    isNew || positiveSafeInteger(payload.id),
    Number.isSafeInteger(payload.type),
    payload.type >= 0,
    payload.type <= 3
  ];
  return checks.every(Boolean);
}

function validateListRequest(query: LabelListRequest) {
  if (!Number.isSafeInteger(query.pageIndex) || query.pageIndex < 0 || !positiveSafeInteger(query.pageSize)) {
    throw new LabelRequestContractError('Label list request is invalid');
  }
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function assertBoundedProof(totalPages: number) {
  if (!Number.isSafeInteger(totalPages) || totalPages < 0 || totalPages > maximumLabelCanonicalProofPages) {
    throw new LabelCanonicalProofLimitError();
  }
}

function assertStableProofPage(page: LabelPage, first: LabelPage, expectedPage: number) {
  assertBoundedProof(page.totalPages);
  if (
    page.number !== expectedPage ||
    page.totalElements !== first.totalElements ||
    page.totalPages !== first.totalPages ||
    page.size !== first.size
  ) {
    throw new LabelContractError('Label canonical page set changed during proof');
  }
}

function normalizeLabelValue(value?: string) {
  return value?.trim() ?? '';
}

export function classifyLabelSuggestionFailure(reason: unknown): 'permission' | 'unavailable' | 'contract' | 'error' {
  if (reason instanceof LabelContractError) return 'contract';
  if (reason instanceof LabelTransportFailure) {
    if (reason.kind === 'permission' || reason.kind === 'unavailable') return reason.kind;
  }
  return 'error';
}

function buildLabelSuggestionCatalog(labels: LabelRecord[]): LabelDrilldownCatalog {
  const catalog = new Map<string, Set<string>>();
  labels.forEach(label => {
    const key = label.name.trim();
    if (!key) return;
    const values = catalog.get(key) ?? new Set<string>();
    const value = normalizeLabelValue(label.tagValue);
    if (value) values.add(value);
    catalog.set(key, values);
  });
  const keys = [...catalog.keys()].sort();
  return {
    keys,
    valuesByKey: Object.fromEntries(keys.map(key => [key, [...(catalog.get(key) ?? [])].sort()])),
    displayNames: [...new Set(labels.map(buildLabelDisplayName))].sort()
  };
}
