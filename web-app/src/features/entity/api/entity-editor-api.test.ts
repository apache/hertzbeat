/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ apiMessageGet: vi.fn(), apiMessagePost: vi.fn(), apiMessagePut: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  ...http
}));

import { ApiMessageError } from '@/core/http/api-message';
import type { EditableEntityDto } from '../model/entity-editor-contract';
import {
  classifyEntityWriteError,
  loadEditableEntity,
  loadEntityCatalogSuggestions,
  saveEditableEntity
} from './entity-editor-api';

const dto: EditableEntityDto = {
  entity: {
    id: 7,
    type: 'service',
    name: 'checkout',
    status: 'degraded',
    source: 'discovery',
    subtype: 'web-service',
    extensions: { preserve: true }
  },
  identities: [{ id: 9, identityType: 'otlp', identityKey: 'service.name', identityValue: 'checkout' }],
  monitorBinds: [{ id: 4, monitorId: 3 }],
  relations: [{ id: 5, targetEntityId: 8 }]
};

describe('entity editor API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Zod-parses the full editable DTO without dropping hidden fields', async () => {
    http.apiMessageGet.mockResolvedValue(dto);
    await expect(loadEditableEntity(7)).resolves.toEqual(dto);
    expect(http.apiMessageGet).toHaveBeenCalledWith('/api/entities/7', undefined);
    http.apiMessageGet.mockResolvedValue({ ...dto, entity: { ...dto.entity, id: null } });
    await expect(loadEditableEntity(7)).rejects.toThrow('Editable entity does not match its request');
  });

  it('parses reusable suggestions while keeping them optional to the core form', async () => {
    http.apiMessageGet.mockResolvedValue({
      owners: ['sre'],
      namespaces: ['payments'],
      environments: ['prod'],
      systems: ['commerce'],
      lifecycles: ['production'],
      tiers: ['tier1'],
      inheritFromRefs: [],
      entityRefs: [],
      languages: ['java'],
      linkProviders: ['docs']
    });
    await expect(loadEntityCatalogSuggestions()).resolves.toMatchObject({ owners: ['sre'], environments: ['prod'] });
    expect(http.apiMessageGet).toHaveBeenCalledWith('/api/entities/catalog-suggestions?limit=120', undefined);
  });

  it('uses POST for create, PUT for edit, and accepts only a positive create id', async () => {
    http.apiMessagePost.mockResolvedValue(41);
    http.apiMessagePut.mockResolvedValue(null);
    await expect(saveEditableEntity('new', dto)).resolves.toBe(41);
    await expect(saveEditableEntity('edit', dto)).resolves.toBe(7);
    expect(http.apiMessagePost).toHaveBeenCalledWith('/api/entities', dto, undefined);
    expect(http.apiMessagePut).toHaveBeenCalledWith('/api/entities', dto, undefined);
    http.apiMessagePost.mockResolvedValue(0);
    await expect(saveEditableEntity('new', dto)).rejects.toThrow();
  });

  it('classifies permission and validation failures without exposing server bodies', () => {
    expect(classifyEntityWriteError(new ApiMessageError('secret', { status: 403 }))).toBe('permission');
    expect(classifyEntityWriteError(new ApiMessageError('secret', { status: 422 }))).toBe('validation');
    expect(classifyEntityWriteError(new ApiMessageError('secret backend detail', { status: 200, code: 1 }))).toBe(
      'validation'
    );
    expect(classifyEntityWriteError(new ApiMessageError('secret', { status: 503 }))).toBe('unavailable');
  });
});
