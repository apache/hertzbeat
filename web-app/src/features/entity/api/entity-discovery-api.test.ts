/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMessageGet } = vi.hoisted(() => ({ apiMessageGet: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  apiMessageGet
}));

import { ApiMessageError } from '@/core/http/api-message';
import { EntityDiscoveryContractError } from '../model/entity-discovery-model';
import { buildEntityDiscoveryApiPath, classifyEntityDiscoveryError, loadEntityDiscovery } from './entity-discovery-api';

const query = { search: 'checkout', pageIndex: 0, pageSize: 8 };
const response = {
  schemaVersion: 1,
  pageIndex: 0,
  pageSize: 8,
  totalElements: 1,
  totalPages: 1,
  content: [
    {
      monitor: { id: 3, name: 'checkout-http', app: 'website', instance: 'checkout:443', status: 1 },
      candidates: [
        {
          resourceId: 7,
          resourceName: 'checkout',
          resourceType: 'service',
          match: 'already_bound',
          matchedKeys: ['service.name']
        }
      ]
    }
  ]
};

describe('entity discovery API', () => {
  beforeEach(() => vi.resetAllMocks());

  it('owns the exact safe endpoint query and parses the versioned monitor projection', async () => {
    apiMessageGet.mockResolvedValue(response);
    const signal = new AbortController().signal;
    await expect(loadEntityDiscovery(query, signal)).resolves.toEqual(response);
    expect(apiMessageGet).toHaveBeenCalledWith('/api/entities/discovery?search=checkout&pageIndex=0&pageSize=8', {
      signal
    });
    expect(buildEntityDiscoveryApiPath({ search: ' mysql ', pageIndex: 2, pageSize: 25 })).toBe(
      '/api/entities/discovery?search=mysql&pageIndex=2&pageSize=25'
    );
  });

  it.each([
    { ...response, schemaVersion: 2 },
    { ...response, pageIndex: 1 },
    {
      ...response,
      content: [{ ...response.content[0], candidates: Array(9).fill(response.content[0]!.candidates[0]) }]
    },
    {
      ...response,
      content: [{ ...response.content[0], candidates: [{ ...response.content[0]!.candidates[0], match: 'score' }] }]
    }
  ])('rejects malformed or request-inconsistent discovery evidence', async invalid => {
    apiMessageGet.mockResolvedValue(invalid);
    await expect(loadEntityDiscovery(query)).rejects.toBeInstanceOf(EntityDiscoveryContractError);
  });

  it.each([
    [new ApiMessageError('entity_discovery_unavailable', { status: 200 }), 'unavailable'],
    [new ApiMessageError('offline', { status: 503 }), 'unavailable'],
    [new ApiMessageError('entity_discovery_search_invalid', { status: 200 }), 'error'],
    [new EntityDiscoveryContractError(), 'error']
  ] as const)('classifies backend failures without exposing their body', (failure, expected) => {
    expect(classifyEntityDiscoveryError(failure)).toBe(expected);
  });
});
