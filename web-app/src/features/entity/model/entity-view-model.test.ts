/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import type { EntityDetail } from './entity-contract';
import { buildEntityExplorePath, entityExploreSignals } from './entity-view-model';

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
