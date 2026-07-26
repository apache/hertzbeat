/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMessageDelete, apiMessageGet } = vi.hoisted(() => ({ apiMessageDelete: vi.fn(), apiMessageGet: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  apiMessageDelete,
  apiMessageGet
}));

import { ApiMessageError } from '@/core/http/api-message';
import { EntityContractError, type EntityQuery } from '../model/entity-contract';
import {
  buildEntityListPath,
  classifyEntityDeleteError,
  deleteEntity,
  loadEntityDetail,
  loadEntities
} from './entity-api';

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
      noiseControlSummary: {
        activeSilenceCount: 1,
        matchingInhibitCount: 1,
        activeSilences: [
          {
            id: 31,
            name: 'Checkout maintenance',
            type: 'silence',
            global: false,
            matchedLabels: ['service.name'],
            updatedAt: 1784786400000
          }
        ],
        matchingInhibits: [
          {
            id: 41,
            name: 'Critical suppresses warning',
            type: 'inhibit',
            global: false,
            matchedLabels: ['service.name', 'environment'],
            updatedAt: 1784786500000
          }
        ],
        possibleAlertSuppression: true
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
      noiseControls: {
        activeSilenceCount: 1,
        matchingInhibitCount: 1,
        possibleAlertSuppression: true,
        activeSilences: [{ id: 31, type: 'silence' }],
        matchingInhibits: [{ id: 41, type: 'inhibit' }]
      },
      boundMonitors: [{ id: 3 }],
      relations: [{ entityId: 8 }]
    });
  });

  it('rejects malformed noise-control evidence instead of hiding it', async () => {
    apiMessageGet.mockResolvedValue({
      entity: { entity, identities: [], monitorBinds: [], relations: [] },
      noiseControlSummary: {
        activeSilenceCount: 0,
        matchingInhibitCount: 1,
        activeSilences: [],
        matchingInhibits: [{ id: 41, name: 'Bad rule', type: 'other', global: false, matchedLabels: [] }],
        possibleAlertSuppression: false
      },
      boundMonitors: [],
      topologyNeighbors: []
    });

    await expect(loadEntityDetail(7)).rejects.toBeInstanceOf(EntityContractError);
  });

  it('rejects malformed list and detail evidence', async () => {
    apiMessageGet.mockResolvedValueOnce({ content: [], totalElements: -1, totalPages: 0, number: 0, size: 10 });
    await expect(loadEntities(query)).rejects.toBeInstanceOf(EntityContractError);
    apiMessageGet.mockResolvedValueOnce({ entity: { entity: { ...entity, id: 0 } } });
    await expect(loadEntityDetail(7)).rejects.toBeInstanceOf(EntityContractError);
  });

  it('deletes exactly one resource through the shared envelope transport', async () => {
    apiMessageDelete.mockResolvedValue(undefined);
    await expect(deleteEntity(7)).resolves.toBeUndefined();
    expect(apiMessageDelete).toHaveBeenCalledWith('/api/entities/7');
  });

  it.each([
    [new ApiMessageError('private permission detail', { status: 403 }), 'permission'],
    [new ApiMessageError('private validation detail', { code: 1, status: 200 }), 'validation'],
    [new ApiMessageError('private conflict detail', { status: 409 }), 'validation'],
    [new ApiMessageError('private unavailable detail', { status: 503 }), 'unavailable'],
    [new ApiMessageError('private missing detail', { status: 404 }), 'missing'],
    [new ApiMessageError('private deleted detail', { code: 15, status: 200 }), 'missing'],
    [new Error('private generic detail'), 'error']
  ] as const)('classifies delete failures without exposing backend text', (failure, expected) => {
    expect(classifyEntityDeleteError(failure)).toBe(expected);
  });
});
