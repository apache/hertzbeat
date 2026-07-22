/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMessageGet } = vi.hoisted(() => ({ apiMessageGet: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  apiMessageGet
}));

import { EntityContractError, type EntityQuery } from '../model/entity-contract';
import { buildEntityListPath, loadEntityDetail, loadEntities } from './entity-api';

const query: EntityQuery = {
  search: 'checkout',
  type: 'service',
  status: '',
  owner: '',
  source: '',
  environment: 'prod',
  lifecycle: '',
  tier: '',
  system: '',
  sort: 'gmtUpdate',
  order: 'desc',
  pageIndex: 0,
  pageSize: 10
};

const entity = {
  id: 7,
  type: 'service',
  name: 'checkout',
  displayName: 'Checkout',
  environment: 'prod',
  status: 'healthy',
  owner: 'sre',
  source: 'manual',
  lifecycle: 'production',
  tier: 'tier1',
  system: 'commerce',
  labels: { region: 'east' },
  tags: ['critical'],
  gmtUpdate: '2026-07-23T12:00:00'
};

describe('entity API', () => {
  beforeEach(() => vi.resetAllMocks());

  it('owns the complete backend list query and parses Spring Page metadata', async () => {
    const signal = new AbortController().signal;
    apiMessageGet.mockResolvedValue({
      content: [{ entity, identityCount: 2, monitorCount: 3, relationCount: 1, activeAlertCount: 0 }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 10,
      first: true,
      last: true,
      empty: false,
      numberOfElements: 1,
      pageable: {},
      sort: {}
    });

    await expect(loadEntities(query, signal)).resolves.toMatchObject({
      content: [{ id: 7, name: 'checkout', monitorCount: 3 }],
      totalElements: 1
    });
    expect(apiMessageGet).toHaveBeenCalledWith(buildEntityListPath(query), { signal });
  });

  it('maps detail identity, operational evidence, monitors, and relations without fake defaults', async () => {
    apiMessageGet.mockResolvedValue({
      entity: {
        entity,
        identities: [{ id: 9, identityType: 'otlp', identityKey: 'service.name', identityValue: 'checkout' }],
        monitorBinds: [],
        relations: []
      },
      status: {
        status: 'degraded',
        reason: 'monitor down',
        monitorTotal: 1,
        monitorUpCount: 0,
        monitorDownCount: 1,
        monitorPausedCount: 0,
        activeAlertCount: 1,
        evaluatedAt: '2026-07-23T12:00:00'
      },
      evidenceSummary: {
        activeAlertCount: 1,
        downMonitorCount: 1,
        healthyMonitorCount: 0,
        identityCount: 1,
        logHintCount: 2,
        lastEvidenceAt: 123
      },
      boundMonitors: [{ id: 3, name: 'checkout-http', app: 'website', instance: 'checkout', status: 2 }],
      topologyNeighbors: [
        {
          relationId: 4,
          entityId: 8,
          entityName: 'payments',
          entityType: 'service',
          direction: 'outgoing',
          relationType: 'depends_on',
          status: 'active'
        }
      ]
    });

    await expect(loadEntityDetail(7)).resolves.toMatchObject({
      entity: { id: 7, name: 'checkout' },
      identities: [{ identityType: 'otlp' }],
      status: { status: 'degraded' },
      boundMonitors: [{ id: 3 }],
      relations: [{ entityId: 8 }]
    });
  });

  it('rejects malformed list and detail evidence', async () => {
    apiMessageGet.mockResolvedValueOnce({ content: [], totalElements: -1, totalPages: 0, number: 0, size: 10 });
    await expect(loadEntities(query)).rejects.toBeInstanceOf(EntityContractError);
    apiMessageGet.mockResolvedValueOnce({ entity: { entity: { ...entity, id: 0 } } });
    await expect(loadEntityDetail(7)).rejects.toBeInstanceOf(EntityContractError);
  });
});
