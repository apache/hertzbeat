/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import type { EntityDetail } from './entity-contract';
import {
  buildEntityCreatePath,
  buildEntityDiscoveryRoute,
  buildEntityEditRoute,
  buildEntityExplorePath,
  entityExploreSignals,
  safeEntityEditorReturnTo
} from './entity-view-model';

describe('entity Explore handoff', () => {
  it('requires usable signal context instead of treating counts as query context', () => {
    const queue: EntityDetail = {
      entity: { id: 8, type: 'queue', name: 'orders' },
      identities: [],
      evidence: { logHintCount: 2 },
      boundMonitors: [{ id: 3, name: 'queue-depth', app: 'rabbitmq' }],
      relations: []
    };
    expect(entityExploreSignals(queue)).toEqual([]);
  });

  it('hands a unique monitor instance to metrics and service identity to logs', () => {
    const queue: EntityDetail = {
      entity: { id: 8, type: 'queue', name: 'orders', environment: 'prod' },
      identities: [],
      boundMonitors: [{ id: 3, name: 'queue-depth', app: 'rabbitmq', instance: 'rabbitmq-1' }],
      relations: []
    };
    expect(entityExploreSignals(queue)).toEqual(['metrics']);
    expect(buildEntityExplorePath(queue, 'metrics')).toContain('instance=rabbitmq-1');

    const service = {
      ...queue,
      entity: { ...queue.entity, type: 'service', name: 'checkout' },
      evidence: { logHintCount: 1 }
    };
    expect(entityExploreSignals(service)).toEqual(['metrics', 'logs']);
    expect(buildEntityExplorePath(service, 'logs')).toContain('serviceName=checkout');
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
