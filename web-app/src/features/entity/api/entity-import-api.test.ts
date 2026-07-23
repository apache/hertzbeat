/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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

const dto = {
  entity: { type: 'service', name: 'checkout' },
  identities: [],
  monitorBinds: [],
  relations: []
};

describe('entity import API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the exact bundle parse path/body and reuses the editable DTO parser', async () => {
    http.apiMessagePost.mockResolvedValue([dto]);
    const request = { content: 'kind: service', format: 'yaml' as const };
    await expect(previewEntityDefinitionBundle(request)).resolves.toEqual([dto]);
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

  it('classifies failures and only exposes bounded code 1/15 server messages without pasted content', () => {
    expect(classifyEntityImportError(new ApiMessageError('Fix resource type', { code: 1 }), 'secret-yaml')).toEqual({
      kind: 'validation',
      message: 'Fix resource type'
    });
    expect(
      classifyEntityImportError(new ApiMessageError('secret-yaml is invalid', { code: 1 }), 'secret-yaml')
    ).toEqual({
      kind: 'validation'
    });
    expect(
      classifyEntityImportError(new ApiMessageError('Value super-secret is invalid', { code: 1 }), 'name: super-secret')
    ).toEqual({ kind: 'validation' });
    expect(classifyEntityImportError(new ApiMessageError('Try again later', { code: 15 }), 'secret-yaml')).toEqual({
      kind: 'unavailable',
      message: 'Try again later'
    });
    expect(classifyEntityImportError(new ApiMessageError('private', { status: 401 }), '')).toEqual({
      kind: 'permission'
    });
    expect(classifyEntityImportError(new Error('private'), '')).toEqual({ kind: 'error' });
  });
});
