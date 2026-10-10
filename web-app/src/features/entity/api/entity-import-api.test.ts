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

import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ apiMessagePost: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  ...http
}));

import { ApiMessageError } from '@/core/http/api-message';
import {
  classifyEntityImportError,
  commitEntityDefinitionBundle,
  previewEntityDefinitionBundle
} from './entity-import-api';

describe('entity import API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the exact bundle parse path/body and reuses the editable DTO parser', async () => {
    const draftDto = {
      entity: { id: null, type: 'service', name: 'checkout', displayName: null, environment: 'prod' },
      identities: null,
      monitorBinds: null,
      relations: null
    };
    http.apiMessagePost.mockResolvedValue([draftDto]);
    const request = { content: 'kind: service', format: 'yaml' as const };
    await expect(previewEntityDefinitionBundle(request)).resolves.toEqual([
      { ...draftDto, entity: { type: 'service', name: 'checkout', displayName: null, environment: 'prod' } }
    ]);
    expect(http.apiMessagePost).toHaveBeenCalledWith('/api/entities/definition/bundle/parse', request, undefined);
    http.apiMessagePost.mockResolvedValue([]);
    await expect(previewEntityDefinitionBundle(request)).rejects.toThrow('Resource definition response is invalid');
  });

  it('uses the exact atomic bundle path and validates ordered positive IDs/count', async () => {
    http.apiMessagePost.mockResolvedValue([11, 12]);
    await expect(commitEntityDefinitionBundle({ content: '[{},{}]', format: 'json' }, 2)).resolves.toEqual([11, 12]);
    expect(http.apiMessagePost).toHaveBeenCalledWith(
      '/api/entities/definition/bundle',
      { content: '[{},{}]', format: 'json' },
      undefined
    );
    http.apiMessagePost.mockResolvedValue([11]);
    await expect(commitEntityDefinitionBundle({ content: '[{},{}]', format: 'json' }, 2)).rejects.toThrow();
    http.apiMessagePost.mockResolvedValue([0, 12]);
    await expect(commitEntityDefinitionBundle({ content: '[{},{}]', format: 'json' }, 2)).rejects.toThrow();
  });

  it('classifies failures without exposing server messages or pasted content', () => {
    expect(classifyEntityImportError(new ApiMessageError('Fix resource type', { code: 1 }))).toEqual({
      kind: 'validation'
    });
    expect(classifyEntityImportError(new ApiMessageError('secret-yaml is invalid', { code: 1 }))).toEqual({
      kind: 'validation'
    });
    expect(classifyEntityImportError(new ApiMessageError('Value super-secret is invalid', { code: 1 }))).toEqual({
      kind: 'validation'
    });
    expect(classifyEntityImportError(new ApiMessageError('Try again later', { code: 15 }))).toEqual({
      kind: 'unavailable'
    });
    expect(classifyEntityImportError(new ApiMessageError('private', { status: 401 }))).toEqual({
      kind: 'permission'
    });
    expect(classifyEntityImportError(new Error('private'))).toEqual({ kind: 'error' });
  });
});
