/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import type { TopologyNode } from './topology-contract';
import { buildTopologyEntityPath, buildTopologySignalPath } from './topology-navigation-model';

describe('topology inspector navigation', () => {
  it('uses the central entity route builder', () => {
    expect(buildTopologyEntityPath(42)).toBe('/entities/42');
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
