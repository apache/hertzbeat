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

import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({
  apiMessageDelete: vi.fn(),
  apiMessageGet: vi.fn(),
  apiMessagePost: vi.fn(),
  apiMessagePut: vi.fn()
}));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  ...http
}));

import { ApiMessageError } from '@/core/http/api-message';

import {
  deleteNoticeTemplate,
  loadNoticeTemplate,
  loadNoticeTemplates,
  saveNoticeTemplate
} from './notice-template-api';
import type { NoticeTemplateDraft } from './notice-template-model';

const custom = { id: 42, name: 'Custom', type: 1 as const, preset: false, content: '${content}' };
const page = { content: [custom], totalElements: 1, totalPages: 1, number: 0, size: 8 };
const query = { name: 'Mail', preset: false, pageIndex: 0, pageSize: 8 };

describe('Notice Template API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the exact list/detail paths and strictly parses both responses', async () => {
    http.apiMessageGet.mockResolvedValueOnce(page).mockResolvedValueOnce(custom);

    await expect(loadNoticeTemplates(query)).resolves.toEqual(page);
    await expect(loadNoticeTemplate(42)).resolves.toEqual(custom);
    expect(http.apiMessageGet).toHaveBeenNthCalledWith(
      1,
      '/api/notice/templates?name=Mail&preset=false&pageIndex=0&pageSize=8'
    );
    expect(http.apiMessageGet).toHaveBeenNthCalledWith(2, '/api/notice/template/42');
  });

  it('accepts only exact null POST and PUT acknowledgements while DELETE remains void', async () => {
    http.apiMessagePost.mockResolvedValue(null);
    http.apiMessagePut.mockResolvedValue(null);
    http.apiMessageDelete.mockResolvedValue({ ignored: true });

    await expect(saveNoticeTemplate({ name: 'New', type: 1, content: '${content}' })).resolves.toBeNull();
    await expect(saveNoticeTemplate({ id: 42, name: 'Updated', type: 1, content: '${content}' })).resolves.toBeNull();
    await expect(deleteNoticeTemplate(42)).resolves.toBeUndefined();
    expect(http.apiMessagePost).toHaveBeenCalledWith('/api/notice/template', {
      name: 'New',
      type: 1,
      preset: false,
      content: '${content}'
    });
    expect(http.apiMessagePut).toHaveBeenCalledWith('/api/notice/template', {
      id: 42,
      name: 'Updated',
      type: 1,
      preset: false,
      content: '${content}'
    });
    expect(http.apiMessageDelete).toHaveBeenCalledWith('/api/notice/template/42');
  });

  it.each([
    ['POST', { unexpectedId: 43 }],
    ['PUT', undefined]
  ])('rejects an unexpected non-null %s response as commit-uncertain invalid evidence', async (method, response) => {
    if (method === 'POST') http.apiMessagePost.mockResolvedValue(response);
    else http.apiMessagePut.mockResolvedValue(response);
    const candidate =
      method === 'POST'
        ? { name: 'New', type: 1 as const, content: '${content}' }
        : { id: 42, name: 'Updated', type: 1 as const, content: '${content}' };

    await expect(saveNoticeTemplate(candidate)).rejects.toMatchObject({
      kind: 'invalid',
      writeOutcome: 'uncertain',
      code: 'NOTICE_TEMPLATE_RESPONSE_INVALID'
    });
  });

  it('rejects malformed list data instead of returning an empty page', async () => {
    http.apiMessageGet.mockResolvedValue({ content: [], totalElements: '0' });

    await expect(loadNoticeTemplates({ name: '', preset: true, pageIndex: 0, pageSize: 8 })).rejects.toMatchObject({
      kind: 'invalid',
      writeOutcome: 'uncertain'
    });
  });

  it.each([
    ['request page mismatch', { ...page, number: 1 }, query],
    ['request size mismatch', { ...page, size: 15 }, query],
    ['inconsistent total pages', { ...page, totalPages: 2 }, query],
    [
      'content beyond the final-page remainder',
      {
        content: [custom, { ...custom, id: 43 }],
        totalElements: 9,
        totalPages: 2,
        number: 1,
        size: 8
      },
      { ...query, pageIndex: 1 }
    ],
    [
      'content on an out-of-range page',
      { content: [custom], totalElements: 8, totalPages: 1, number: 2, size: 8 },
      { ...query, pageIndex: 2 }
    ],
    [
      'duplicate custom backend ids',
      { content: [custom, { ...custom, name: 'Other' }], totalElements: 2, totalPages: 1, number: 0, size: 8 },
      query
    ],
    [
      'duplicate id-less preset identities',
      {
        content: [
          { name: 'Built-in', type: 1, preset: true, content: '${one}' },
          { name: 'Built-in', type: 1, preset: true, content: '${two}' }
        ],
        totalElements: 2,
        totalPages: 1,
        number: 0,
        size: 8
      },
      query
    ],
    ['custom row in the preset branch', page, { ...query, preset: true }],
    [
      'preset row in the custom branch',
      {
        content: [{ name: 'Built-in', type: 1, preset: true, content: '${content}' }],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 8
      },
      query
    ],
    [
      'short non-last page under authoritative totals',
      {
        content: Array.from({ length: 7 }, (_, index) => ({ ...custom, id: index + 1 })),
        totalElements: 9,
        totalPages: 2,
        number: 0,
        size: 8
      },
      query
    ],
    [
      'short last page under authoritative totals',
      { content: [], totalElements: 9, totalPages: 2, number: 1, size: 8 },
      { ...query, pageIndex: 1 }
    ]
  ])('rejects Spring page evidence with %s', async (_label, evidence, request) => {
    http.apiMessageGet.mockResolvedValue(evidence);

    await expect(loadNoticeTemplates(request)).rejects.toMatchObject({
      kind: 'invalid',
      writeOutcome: 'uncertain',
      code: 'NOTICE_TEMPLATE_RESPONSE_INVALID'
    });
  });

  it('redacts unknown telemetry and template content from strict contract failures', async () => {
    const privateBody = '${private-template-body}';
    const privateTelemetry = 'trace-private-token';
    http.apiMessageGet.mockResolvedValue({
      ...page,
      content: [{ ...custom, content: privateBody, telemetry: privateTelemetry }]
    });

    let failure: unknown;
    try {
      await loadNoticeTemplates(query);
    } catch (reason: unknown) {
      failure = reason;
    }
    expect(failure).toMatchObject({
      kind: 'invalid',
      writeOutcome: 'uncertain',
      code: 'NOTICE_TEMPLATE_RESPONSE_INVALID'
    });
    expect(failure).not.toHaveProperty('cause');
    expect(JSON.stringify(failure)).not.toContain(privateBody);
    expect(JSON.stringify(failure)).not.toContain(privateTelemetry);
  });

  it('classifies the detail endpoint business failure as missing evidence', async () => {
    http.apiMessageGet.mockRejectedValue(new ApiMessageError('missing', { code: 15, status: 200 }));

    await expect(loadNoticeTemplate(42)).rejects.toMatchObject({ kind: 'missing', writeOutcome: 'uncertain' });
  });

  it('normalizes transport evidence at every API operation boundary', async () => {
    const failure = () => new ApiMessageError('private network evidence');
    const expected = { kind: 'unavailable', writeOutcome: 'uncertain' };

    http.apiMessageGet.mockRejectedValueOnce(failure()).mockRejectedValueOnce(failure());
    http.apiMessagePost.mockRejectedValueOnce(failure());
    http.apiMessagePut.mockRejectedValueOnce(failure());
    http.apiMessageDelete.mockRejectedValueOnce(failure());

    await expect(loadNoticeTemplates({ name: '', preset: false, pageIndex: 0, pageSize: 8 })).rejects.toMatchObject(
      expected
    );
    await expect(loadNoticeTemplate(42)).rejects.toMatchObject(expected);
    await expect(saveNoticeTemplate({ name: 'New', type: 1, content: '${content}' })).rejects.toMatchObject(expected);
    await expect(saveNoticeTemplate({ id: 42, name: 'Updated', type: 1, content: '${content}' })).rejects.toMatchObject(
      expected
    );
    await expect(deleteNoticeTemplate(42)).rejects.toMatchObject(expected);
  });

  it('normalizes malformed runtime input before it can escape the write API boundary', async () => {
    const malformed = { name: null, type: 1, content: '${content}' } as unknown as NoticeTemplateDraft;

    await expect(saveNoticeTemplate(malformed)).rejects.toMatchObject({
      kind: 'error',
      writeOutcome: 'uncertain'
    });
    expect(http.apiMessagePost).not.toHaveBeenCalled();
    expect(http.apiMessagePut).not.toHaveBeenCalled();
  });
});
