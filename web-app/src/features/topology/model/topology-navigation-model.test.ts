/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import type { TopologyNode } from './topology-contract';
import { buildTopologyEntityPath, buildTopologySignalPath, safeTopologyReturnTo } from './topology-navigation-model';

describe('topology inspector navigation', () => {
  it('uses the central entity route builder with the complete safe topology return query', () => {
    const source =
      '/topology?focusEntityId=7&depth=2&environment=prod&sourceKind=otel&start=1000&end=2000' +
      '&relationType=calls&hideInternal=false&pageIndex=3&pageSize=50&token=private&unknown=value';
    const path = buildTopologyEntityPath(42, source);

    expect(path).toContain('/entities/42?returnTo=');
    expect(new URL(path, 'https://hertzbeat.local').searchParams.get('returnTo')).toBe(
      '/topology?focusEntityId=7&depth=2&environment=prod&sourceKind=otel&start=1000&end=2000' +
        '&relationType=calls&hideInternal=false&pageIndex=3&pageSize=50'
    );
    expect(path).not.toContain('private');
    expect(path).not.toContain('unknown');
  });

  it('accepts only a valid topology path and public query evidence', () => {
    expect(safeTopologyReturnTo('/topology?depth=2&token=private')).toBe('/topology?depth=2');
    expect(safeTopologyReturnTo('/topology?start=1000')).toBe('/topology');
    expect(safeTopologyReturnTo('/topology-evil?depth=2')).toBe('/topology');
    expect(safeTopologyReturnTo('https://evil.example/topology?depth=2')).toBe('/topology');
  });

  it('uses the central exact-window signal handoff for service nodes', () => {
    const path = buildTopologySignalPath(serviceNode(), { from: 1_000, to: 2_000 });

    expect(path).toContain('/explore?');
    expect(path).toContain('signal=metrics');
    expect(path).toContain('serviceName=checkout');
    expect(path).toContain('serviceNamespace=store');
    expect(path).toContain('environment=prod');
    expect(path).toContain('start=1000');
    expect(path).toContain('end=2000');
  });

  it('does not fabricate signal context for non-service nodes or an absent exact window', () => {
    expect(buildTopologySignalPath({ ...serviceNode(), entityType: 'database' }, { from: 1_000, to: 2_000 })).toBe(
      undefined
    );
    expect(buildTopologySignalPath(serviceNode(), undefined)).toBe(undefined);
  });
});

function serviceNode(): TopologyNode {
  return {
    id: 'checkout',
    entityId: 42,
    entityName: 'checkout',
    entityType: 'service',
    namespace: 'store',
    environment: 'prod',
    health: 'unknown',
    focus: true,
    evidenceBadges: [],
    redMetrics: {
      requestRatePerSecond: null,
      requestCount: null,
      errorRate: null,
      errorCount: null,
      latencyP95Ms: null,
      latencyAvgMs: null
    }
  };
}
