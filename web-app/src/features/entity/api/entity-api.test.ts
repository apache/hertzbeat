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
  classifyEntityReadError,
  classifyEntityDetailReadError,
  classifyEntityDeleteError,
  deleteEntity,
  loadEntityDetail,
  loadEntityMonitors,
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

  it('owns the complete backend list query and maps the manager PageResponse metadata', async () => {
    const signal = new AbortController().signal;
    apiMessageGet.mockResolvedValue({
      content: [{ entity, identityCount: 2, monitorCount: 3, relationCount: 1, activeAlertCount: 0 }],
      totalElements: 1,
      pageIndex: 0,
      pageSize: 10
    });

    await expect(loadEntities(query, signal)).resolves.toMatchObject({
      content: [{ id: 7, name: 'checkout', monitorCount: 3 }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 10
    });
    expect(apiMessageGet).toHaveBeenCalledWith(buildEntityListPath(query), { signal });
  });

  it.each([
    {
      caseName: 'page identity drift',
      value: {
        content: [],
        totalElements: 0,
        pageIndex: 1,
        pageSize: 10
      }
    },
    {
      caseName: 'impossible row count',
      value: {
        content: [
          { entity, identityCount: 2, monitorCount: 3, relationCount: 1, activeAlertCount: 0 },
          { entity: { ...entity, id: 8 }, identityCount: 0, monitorCount: 0, relationCount: 0, activeAlertCount: 0 }
        ],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 10
      }
    },
    {
      caseName: 'duplicate entity ids',
      value: {
        content: [
          { entity, identityCount: 2, monitorCount: 3, relationCount: 1, activeAlertCount: 0 },
          { entity, identityCount: 2, monitorCount: 3, relationCount: 1, activeAlertCount: 0 }
        ],
        totalElements: 2,
        pageIndex: 0,
        pageSize: 10
      }
    }
  ])('rejects $caseName in entity list evidence', async ({ value }) => {
    apiMessageGet.mockResolvedValue(value);
    await expect(loadEntities(query)).rejects.toBeInstanceOf(EntityContractError);
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
      monitorSummary: { totalBoundMonitors: 75 },
      logSummary: { totalLogs: 3 },
      traceSummary: { totalTraces: 2 },
      metricEvidence: [{ metric: 'latency' }],
      logEvidence: [{ message: 'failed' }],
      traceEvidence: [{ traceId: 'trace-1' }],
      unifiedEvidenceSummary: { metricsActive: true },
      triageRecommendation: {
        mode: 'evidence',
        recommendedFocus: 'logs',
        headline: 'Inspect correlated logs',
        summary: 'A log query hint is available',
        whyNow: 'One monitor is down',
        actionLabel: 'Open logs',
        generatedAt: 123
      },
      opsSummary: {
        ownerReady: true,
        runbookReady: false,
        relationReady: true,
        telemetryReady: true,
        statusReady: true,
        readinessScore: 80,
        relationCount: 1
      },
      nextActions: [
        {
          actionType: 'review_alerts',
          title: 'Review alerts',
          summary: 'One alert is firing',
          actionLabel: 'Open alerts',
          priority: 100
        },
        {
          actionType: 'future_action',
          title: 'Future action',
          summary: 'A newer backend can add an action safely',
          actionLabel: 'Open future action',
          priority: 10
        }
      ],
      responseHandoffs: {
        alerts: {
          search: 'checkout',
          status: 'firing',
          severity: 'critical',
          serviceName: 'checkout',
          environment: 'prod',
          returnTo: '/entities/7'
        },
        logs: {
          search: 'trace-1',
          traceId: 'trace-1',
          serviceName: 'checkout',
          environment: 'prod',
          start: 100,
          end: 200,
          returnTo: '/entities/7'
        },
        traces: {
          traceId: 'trace-1',
          spanId: 'span-1',
          serviceName: 'checkout',
          environment: 'prod',
          start: 100,
          end: 200,
          returnTo: '/entities/7'
        }
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
      monitorPreview: { items: [{ id: 3 }], total: 75, complete: false },
      monitorSummary: { totalBoundMonitors: 75 },
      logSummary: { totalLogs: 3 },
      traceSummary: { totalTraces: 2 },
      metricEvidence: [{ metric: 'latency' }],
      logEvidence: [{ message: 'failed' }],
      traceEvidence: [{ traceId: 'trace-1' }],
      unifiedEvidenceSummary: { metricsActive: true },
      triageRecommendation: { mode: 'evidence', recommendedFocus: 'logs' },
      opsSummary: { readinessScore: 80, runbookReady: false },
      nextActions: [{ actionType: 'review_alerts', priority: 100 }],
      responseHandoffs: {
        alerts: { search: 'checkout', status: 'firing', severity: 'critical' },
        logs: { traceId: 'trace-1', serviceName: 'checkout', start: 100, end: 200 },
        traces: { traceId: 'trace-1', spanId: 'span-1', serviceName: 'checkout', start: 100, end: 200 }
      },
      relations: [{ entityId: 8 }]
    });
  });

  it('marks a bounded monitor preview complete only when every bound monitor is present', async () => {
    apiMessageGet.mockResolvedValue({
      entity: { entity, identities: [], monitorBinds: [], relations: [] },
      monitorSummary: { totalBoundMonitors: 1 },
      boundMonitors: [{ id: 3, name: 'checkout-http', app: 'website' }],
      topologyNeighbors: []
    });

    await expect(loadEntityDetail(7)).resolves.toMatchObject({
      monitorPreview: { total: 1, complete: true }
    });
  });

  it('rejects a monitor summary whose total is smaller than its preview', async () => {
    apiMessageGet.mockResolvedValue({
      entity: { entity, identities: [], monitorBinds: [], relations: [] },
      monitorSummary: { totalBoundMonitors: 0 },
      boundMonitors: [{ id: 3, name: 'checkout-http', app: 'website' }],
      topologyNeighbors: []
    });

    await expect(loadEntityDetail(7)).rejects.toBeInstanceOf(EntityContractError);
  });

  it('loads one normalized operational monitor page through the feature API', async () => {
    const signal = new AbortController().signal;
    apiMessageGet.mockResolvedValue({
      content: Array.from({ length: 50 }, (_, index) => ({
        id: index + 1,
        name: `checkout-http-${index}`,
        app: 'website',
        status: 2
      })),
      totalElements: 75,
      totalPages: 2,
      number: 0,
      size: 50,
      first: true,
      last: false,
      empty: false,
      numberOfElements: 50,
      pageable: {},
      sort: {}
    });

    await expect(
      loadEntityMonitors(7, { status: 2, app: ' website ', pageIndex: 0, pageSize: 50 }, signal)
    ).resolves.toMatchObject({ totalElements: 75, number: 0, size: 50 });
    expect(apiMessageGet).toHaveBeenCalledWith(
      '/api/entities/7/monitors?pageIndex=0&pageSize=50&status=2&app=website',
      { signal }
    );
  });

  it('rejects an operational monitor page that does not match the requested page', async () => {
    apiMessageGet.mockResolvedValue({
      content: [],
      totalElements: 75,
      totalPages: 2,
      number: 1,
      size: 50
    });

    await expect(loadEntityMonitors(7, { pageIndex: 0, pageSize: 50 })).rejects.toBeInstanceOf(EntityContractError);
  });

  it('accepts the backend case-insensitive app filter contract', async () => {
    apiMessageGet.mockResolvedValue({
      content: [{ id: 3, name: 'checkout-http', app: 'springboot3', status: 2 }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 50
    });

    await expect(loadEntityMonitors(7, { app: 'SpringBoot3', pageIndex: 0, pageSize: 50 })).resolves.toMatchObject({
      totalElements: 1
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
    [new ApiMessageError('private unauthenticated detail', { status: 401 }), 'permission'],
    [new ApiMessageError('private permission detail', { status: 403 }), 'permission'],
    [new ApiMessageError('private validation detail', { code: 1, status: 200 }), 'validation'],
    [new ApiMessageError('private conflict detail', { status: 409 }), 'validation'],
    [new ApiMessageError('private unavailable detail', { status: 503 }), 'unavailable'],
    [new ApiMessageError('private missing detail', { status: 404 }), 'missing'],
    [new ApiMessageError('private missing detail', { code: 3, status: 200 }), 'missing'],
    [new ApiMessageError('private deleted detail', { code: 15, status: 200 }), 'missing'],
    [new Error('private generic detail'), 'error']
  ] as const)('classifies delete failures without exposing backend text', (failure, expected) => {
    expect(classifyEntityDeleteError(failure)).toBe(expected);
  });

  it.each([
    [new ApiMessageError('private unauthenticated detail', { status: 401 }), 'permission'],
    [new ApiMessageError('private forbidden detail', { status: 403 }), 'permission'],
    [new ApiMessageError('private missing detail', { status: 404 }), 'missing'],
    [new ApiMessageError('private missing detail', { code: 3, status: 200 }), 'missing'],
    [new ApiMessageError('private legacy detail', { code: 15, status: 200 }), 'missing'],
    [new ApiMessageError('private unavailable detail', { status: 503 }), 'unavailable'],
    [new Error('private generic detail'), 'error']
  ] as const)('classifies detail failures without exposing backend text', (failure, expected) => {
    expect(classifyEntityDetailReadError(failure)).toBe(expected);
  });

  it.each([
    [new ApiMessageError('private unauthenticated list', { status: 401 }), 'permission'],
    [new ApiMessageError('private forbidden list', { status: 403 }), 'permission'],
    [new ApiMessageError('private unavailable list', { status: 503 }), 'unavailable'],
    [new EntityContractError('private contract detail'), 'error']
  ] as const)('classifies list failures without exposing backend text', (failure, expected) => {
    expect(classifyEntityReadError(failure)).toBe(expected);
  });
});
