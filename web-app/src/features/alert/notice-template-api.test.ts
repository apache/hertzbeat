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

describe('Notice Template API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the exact list/detail paths and strictly parses both responses', async () => {
    http.apiMessageGet.mockResolvedValueOnce(page).mockResolvedValueOnce(custom);

    await expect(loadNoticeTemplates({ name: 'Mail', preset: false, pageIndex: 0, pageSize: 8 })).resolves.toEqual(
      page
    );
    await expect(loadNoticeTemplate(42)).resolves.toEqual(custom);
    expect(http.apiMessageGet).toHaveBeenNthCalledWith(
      1,
      '/api/notice/templates?name=Mail&preset=false&pageIndex=0&pageSize=8'
    );
    expect(http.apiMessageGet).toHaveBeenNthCalledWith(2, '/api/notice/template/42');
  });

  it('keeps POST, PUT, and DELETE as explicit void acknowledgements', async () => {
    http.apiMessagePost.mockResolvedValue({ ignored: true });
    http.apiMessagePut.mockResolvedValue({ ignored: true });
    http.apiMessageDelete.mockResolvedValue({ ignored: true });

    await expect(saveNoticeTemplate({ name: 'New', type: 1, content: '${content}' })).resolves.toBeUndefined();
    await expect(
      saveNoticeTemplate({ id: 42, name: 'Updated', type: 1, content: '${content}' })
    ).resolves.toBeUndefined();
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

  it('rejects malformed list data instead of returning an empty page', async () => {
    http.apiMessageGet.mockResolvedValue({ content: [], totalElements: '0' });

    await expect(loadNoticeTemplates({ name: '', preset: true, pageIndex: 0, pageSize: 8 })).rejects.toMatchObject({
      kind: 'invalid',
      writeOutcome: 'uncertain'
    });
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
