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

const http = vi.hoisted(() => ({ apiMessageGet: vi.fn(), apiMessagePost: vi.fn(), apiMessagePut: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  ...http
}));

import { ApiMessageError } from '@/core/http/api-message';
import { EntityContractError } from '../model/entity-contract';
import {
  classifyEntityDefinitionError,
  loadEntityDefinition,
  previewEntityDefinition,
  saveEntityDefinition
} from './entity-definition-api';

const draft = {
  entity: { id: null, type: 'service', name: 'checkout' },
  identities: null,
  monitorBinds: null,
  relations: null
};

describe('entity definition API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses exact GET format query and accepts only nonblank canonical text', async () => {
    http.apiMessageGet.mockResolvedValue('kind: service\n');
    await expect(loadEntityDefinition(7, 'yaml')).resolves.toBe('kind: service\n');
    expect(http.apiMessageGet).toHaveBeenCalledWith('/api/entities/7/definition?format=yaml', undefined);
    http.apiMessageGet.mockResolvedValue('   ');
    await expect(loadEntityDefinition(7, 'yaml')).rejects.toThrow();
  });

  it('uses exact parse POST and final PUT bodies while sharing the editable DTO parser', async () => {
    const request = { content: 'kind: service', format: 'yaml' as const };
    http.apiMessagePost.mockResolvedValue(draft);
    await expect(previewEntityDefinition(7, request)).resolves.toMatchObject({ entity: { name: 'checkout' } });
    expect(http.apiMessagePost).toHaveBeenCalledWith('/api/entities/7/definition/parse', request, undefined);
    http.apiMessagePut.mockResolvedValue(null);
    await expect(saveEntityDefinition(7, request)).resolves.toBeUndefined();
    expect(http.apiMessagePut).toHaveBeenCalledWith('/api/entities/7/definition', request, undefined);
    http.apiMessagePut.mockResolvedValue(7);
    await expect(saveEntityDefinition(7, request)).rejects.toThrow();
  });

  it('classifies missing, permission, validation, unavailable, contract, and error without content leaks', () => {
    expect(classifyEntityDefinitionError(new ApiMessageError('missing', { code: 3 }))).toEqual({ kind: 'missing' });
    expect(classifyEntityDefinitionError(new ApiMessageError('private', { status: 403 }))).toEqual({
      kind: 'permission'
    });
    expect(classifyEntityDefinitionError(new ApiMessageError('secret', { code: 1 }))).toEqual({ kind: 'validation' });
    expect(classifyEntityDefinitionError(new ApiMessageError('secret', { code: 15 }))).toEqual({ kind: 'unavailable' });
    expect(classifyEntityDefinitionError(new EntityContractError('secret'))).toEqual({ kind: 'contract' });
    expect(classifyEntityDefinitionError(new Error('bad'))).toEqual({ kind: 'error' });
  });
});
