/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import type { EntityDetail } from './entity-contract';
import {
  buildEntityNextActionPath,
  buildEntityExplorePath,
  entityExploreSignals
} from './entity-operational-navigation';
import {
  buildEntityCreatePath,
  buildEntityDiscoveryRoute,
  buildEntityEditRoute,
  buildEntityNoiseControlPath,
  safeEntityReturnTo,
  safeEntityEditorReturnTo
} from './entity-view-model';

describe('entity Explore handoff', () => {
  it('requires usable signal context instead of treating counts as query context', () => {
    const queue: EntityDetail = {
      entity: { id: 8, type: 'queue', name: 'orders' },
      identities: [],
      evidence: { logHintCount: 2 },
      monitorPreview: {
        items: [{ id: 3, name: 'queue-depth', app: 'rabbitmq' }],
        total: 1,
        complete: true
      },
      relations: []
    };
    expect(entityExploreSignals(queue)).toEqual([]);
  });

  it('hands a unique monitor instance to metrics and service identity to logs', () => {
    const queue: EntityDetail = {
      entity: { id: 8, type: 'queue', name: 'orders', environment: 'prod' },
      identities: [],
      monitorPreview: {
        items: [{ id: 3, name: 'queue-depth', app: 'rabbitmq', instance: 'rabbitmq-1' }],
        total: 1,
        complete: true
      },
      relations: []
    };
    expect(entityExploreSignals(queue)).toEqual(['metrics']);
    expect(buildEntityExplorePath(queue, 'metrics')).toContain('instance=rabbitmq-1');

    const service = {
      ...queue,
      entity: { ...queue.entity, type: 'service', name: 'checkout' },
      evidence: { logHintCount: 1 },
      responseHandoffs: {
        traces: {
          search: 'trace-1',
          traceId: 'trace-1',
          spanId: 'span-1',
          serviceName: 'checkout',
          environment: 'prod',
          start: 100,
          end: 200
        }
      }
    };
    expect(entityExploreSignals(service)).toEqual(['metrics', 'logs', 'traces']);
    expect(buildEntityExplorePath(service, 'logs')).toContain('serviceName=checkout');
    expect(buildEntityExplorePath(service, 'traces')).toBe(
      '/explore?signal=traces&timeRange=last-30m&traceId=trace-1&spanId=span-1&start=100&end=200&serviceName=checkout&environment=prod'
    );
    expect(
      buildEntityExplorePath(
        {
          ...service,
          responseHandoffs: { traces: { ...service.responseHandoffs.traces, search: 'checkout-operation' } }
        },
        'traces'
      )
    ).toContain('query=checkout-operation');
  });

  it('does not infer a unique non-service instance from an incomplete preview', () => {
    const queue: EntityDetail = {
      entity: { id: 8, type: 'queue', name: 'orders' },
      identities: [],
      monitorPreview: {
        items: [{ id: 3, name: 'queue-depth', app: 'rabbitmq', instance: 'rabbitmq-1' }],
        total: 75,
        complete: false
      },
      relations: []
    };

    expect(entityExploreSignals(queue)).toEqual([]);
  });

  it('accepts an exact safe topology return target without carrying sensitive query data', () => {
    expect(
      safeEntityReturnTo(
        '/topology?focusEntityId=7&depth=2&environment=prod&pageIndex=3&pageSize=50&token=private&unknown=value'
      )
    ).toBe('/topology?focusEntityId=7&depth=2&environment=prod&pageIndex=3&pageSize=50');
  });
});

describe('entity operational next-action handoff', () => {
  const detail: EntityDetail = {
    entity: { id: 7, type: 'service', name: 'checkout', environment: 'prod' },
    identities: [],
    monitorPreview: { items: [], total: 0, complete: true },
    nextActions: [
      {
        actionType: 'review_alerts',
        title: 'Review alerts',
        summary: 'One alert is firing',
        actionLabel: 'Open alerts',
        priority: 100
      }
    ],
    responseHandoffs: {
      alerts: {
        search: 'checkout',
        status: 'firing',
        severity: 'critical',
        serviceName: 'checkout',
        environment: 'prod'
      },
      logs: {
        traceId: 'trace-1',
        serviceName: 'checkout',
        environment: 'prod',
        start: 100,
        end: 200
      }
    },
    relations: []
  };

  it('maps backend action codes to canonical feature routes', () => {
    expect(buildEntityNextActionPath(detail, 'review_alerts')).toBe(
      '/alerts?pageIndex=0&pageSize=8&search=checkout&status=firing&severity=critical&serviceName=checkout&environment=prod'
    );
    expect(buildEntityNextActionPath(detail, 'inspect_logs')).toBe(
      '/explore?signal=logs&timeRange=last-30m&traceId=trace-1&start=100&end=200&serviceName=checkout&environment=prod'
    );
    expect(buildEntityNextActionPath(detail, 'complete_runbook')).toContain('focus=ownership');
    expect(buildEntityNextActionPath(detail, 'review_relations')).toContain('focus=relations');
  });

  it('does not turn an unknown backend action into navigation', () => {
    expect(buildEntityNextActionPath(detail, 'future_action')).toBeUndefined();
  });
});

describe('entity editor navigation', () => {
  it('carries only canonical resource return targets into create and edit routes', () => {
    const query = {
      search: 'checkout',
      type: '',
      status: '',
      owner: '',
      source: '',
      environment: '',
      lifecycle: '',
      tier: '',
      system: '',
      sort: 'gmtUpdate' as const,
      order: 'desc' as const,
      pageIndex: 0,
      pageSize: 10 as const
    };
    expect(buildEntityCreatePath(query)).toContain('/entities/new?returnTo=');
    const discovery = buildEntityDiscoveryRoute(query);
    expect(discovery).toContain('/entities/discovery?');
    expect(decodeURIComponent(discovery)).toContain('/entities?');
    expect(decodeURIComponent(discovery)).toContain('search=checkout');
    expect(buildEntityEditRoute(7, '/entities?search=checkout')).toContain('/entities/7/edit?returnTo=');
    expect(safeEntityEditorReturnTo('https://evil.example', 7)).toBe('/entities');
    expect(safeEntityEditorReturnTo('/entities/8', 7)).toBe('/entities');
    expect(safeEntityEditorReturnTo('/entities/7?returnTo=https%3A%2F%2Fevil.example', 7)).toBe(
      '/entities/7?returnTo=%2Fentities'
    );
  });
});

describe('entity noise-control navigation', () => {
  it('builds a canonical matched-rule handoff from the entity evidence', () => {
    const detail: EntityDetail = {
      entity: { id: 7, type: 'service', name: 'checkout', displayName: 'Checkout API' },
      identities: [],
      noiseControls: {
        activeSilenceCount: 5,
        matchingInhibitCount: 1,
        activeSilences: [
          { id: 31, name: 'Maintenance', type: 'silence', global: false, matchedLabels: [] },
          { id: 33, name: 'Global maintenance', type: 'silence', global: true, matchedLabels: [] }
        ],
        matchingInhibits: [{ id: 41, name: 'Critical first', type: 'inhibit', global: false, matchedLabels: [] }],
        possibleAlertSuppression: true
      },
      monitorPreview: { items: [], total: 0, complete: true },
      relations: []
    };

    expect(buildEntityNoiseControlPath(detail, 'silence')).toBe(
      '/alerts/silences?pageIndex=0&pageSize=8&entityId=7&entityName=Checkout+API&returnTo=%2Fentities%2F7&matchMode=entity-noise-controls&matchingRuleType=silence&matchingRuleIds=31%2C33'
    );
    expect(buildEntityNoiseControlPath(detail, 'inhibit')).toContain('matchingRuleType=inhibit&matchingRuleIds=41');
  });
});
