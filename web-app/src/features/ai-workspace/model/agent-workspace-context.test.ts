/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it, vi } from 'vitest';

import {
  buildAgentWorkspacePath,
  canMaterializeAgentInvestigation,
  deriveAgentTargetFromLocation,
  materializeAgentInvestigation,
  parseAgentTargetContextFromLocation
} from './agent-workspace-context';

describe('Agent workspace context handoff', () => {
  const exactTarget = {
    monitorId: 42,
    signal: {
      type: 'metrics' as const,
      query: 'basic.max_connections',
      start: 200_000,
      end: 2_000_000,
      timezone: 'Asia/Shanghai'
    }
  };

  it('only derives a source intent from an exact AI monitor metric URL', () => {
    const path = buildAgentWorkspacePath(exactTarget, '/monitors/42?password=secret&history=30m');
    expect(path).not.toContain('timeRange');
    expect(path).not.toContain('password');
    expect(path).toContain('timezone=Asia%2FShanghai');
    expect(path).toContain('returnTo=%2Fmonitors%2F42%3Fhistory%3D30m');
    expect(deriveAgentTargetFromLocation(new URL(path, 'http://localhost'))).toEqual(exactTarget);
  });

  it('roundtrips only an exact persisted single-alert source intent', () => {
    const alertTarget = { alertId: 42, alertType: 'single' as const };
    const path = buildAgentWorkspacePath(alertTarget, '/alerts?password=secret&status=firing');

    expect(path).toContain('source=singleAlert');
    expect(path).toContain('alertId=42');
    expect(path).not.toContain('alertType');
    expect(path).not.toContain('password');
    expect(deriveAgentTargetFromLocation(new URL(path, 'http://localhost'))).toEqual(alertTarget);
  });

  it('roundtrips and materializes only an exact Entity source intent', () => {
    const path = buildAgentWorkspacePath({ entityId: 73 }, '/entities/73?password=secret&returnTo=%2Fentities');

    expect(path).toContain('source=entity');
    expect(path).toContain('entityId=73');
    expect(path).not.toContain('password');
    expect(deriveAgentTargetFromLocation(new URL(path, 'http://localhost'))).toEqual({ entityId: 73 });
    expect(canMaterializeAgentInvestigation({ pathname: '/entities/73', search: '?password=secret' })).toBe(true);
    expect(materializeAgentInvestigation({ pathname: '/entities/73', search: '?password=secret' })).toEqual({
      entityId: 73
    });
  });

  it('roundtrips only the complete canonical Topology source scope', () => {
    const target = {
      topology: {
        rootEntityId: 10,
        nodeId: 'entity:10',
        depth: 2 as const,
        environment: 'prod',
        sourceKind: 'otlp-trace-call',
        start: 1_000,
        end: 2_000,
        relationType: 'trace-call',
        hideInternal: true,
        pageIndex: 1,
        pageSize: 50
      }
    };
    const path = buildAgentWorkspacePath(target, '/topology?focusEntityId=10&password=secret');

    expect(path).not.toContain('password');
    expect(path).toContain('source=topology');
    expect(deriveAgentTargetFromLocation(new URL(path, 'http://localhost'))).toEqual(target);
  });

  it('roundtrips only the exact Trace Explore source scope', () => {
    const target = {
      trace: {
        traceId: 'trace-42',
        spanId: 'span-7',
        start: 1_000,
        end: 2_000,
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'prod',
        resourceFilter: 'service.version=1',
        attributeFilter: 'http.status_code=503',
        minDurationMs: 10,
        maxDurationMs: 20
      }
    };
    const path = buildAgentWorkspacePath(target, '/explore?signal=traces&traceId=trace-42&apiKey=secret');

    expect(path).not.toContain('apiKey');
    expect(path).toContain('source=trace');
    expect(deriveAgentTargetFromLocation(new URL(path, 'http://localhost'))).toEqual(target);
  });

  it('roundtrips only the exact Log Explore source page scope', () => {
    const target = {
      log: {
        start: 1_000,
        end: 2_000,
        traceId: 'trace-42',
        spanId: 'span-7',
        severityText: 'WARN' as const,
        search: 'timeout',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'prod',
        resourceFilter: 'service.version=1',
        attributeFilter: 'http.status_code=503',
        hideInternal: true,
        hideNoise: false,
        pageIndex: 2,
        pageSize: 20
      }
    };
    const path = buildAgentWorkspacePath(target, '/explore?signal=logs&apiKey=secret');

    expect(path).not.toContain('apiKey');
    expect(path).toContain('source=log');
    expect(deriveAgentTargetFromLocation(new URL(path, 'http://localhost'))).toEqual(target);
  });

  it.each(['/explore', '/topology', '/alerts', '/monitors/42'])(
    'does not derive unsupported or pre-materialized target from %s',
    pathname => expect(deriveAgentTargetFromLocation({ pathname, search: '' })).toBeUndefined()
  );

  it('materializes the selected monitor range into an immutable click-time investigation scope', () => {
    const target = materializeAgentInvestigation(
      { pathname: '/monitors/42', search: '?metric=basic.max_connections&history=30m' },
      () => 2_000_000,
      () => 'Asia/Shanghai'
    );
    expect(target).toEqual(exactTarget);
    if (!target || !('signal' in target)) throw new Error('Expected a monitor metric target');
    expect(canMaterializeAgentInvestigation({ pathname: '/monitors/42', search: '?metric=basic&history=30m' })).toBe(
      false
    );
    expect(canMaterializeAgentInvestigation({ pathname: '/monitors/42', search: '?metric=a.b.c&history=30m' })).toBe(
      false
    );
  });

  it('reads the click clock once when materializing a monitor investigation', () => {
    const clock = vi.fn(() => 2_000_000);
    const timezone = vi.fn(() => 'Asia/Shanghai');
    const target = materializeAgentInvestigation(
      { pathname: '/monitors/42', search: '?metric=basic.max_connections&history=30m' },
      clock,
      timezone
    );

    if (!target || !('signal' in target)) throw new Error('Expected a monitor metric target');
    expect(target.signal).toMatchObject({ start: 200_000, end: 2_000_000, timezone: 'Asia/Shanghai' });
    expect(clock).toHaveBeenCalledOnce();
    expect(timezone).toHaveBeenCalledOnce();
  });

  it('fails closed when the exact timezone or window is invalid', () => {
    expect(
      materializeAgentInvestigation(
        { pathname: '/monitors/42', search: '?metric=basic.max_connections&history=30m' },
        () => 2_000_000,
        () => 'not/a-zone'
      )
    ).toBeUndefined();
    expect(
      deriveAgentTargetFromLocation({
        pathname: '/ai',
        search: '?monitorId=42&signal=metrics&query=basic.max_connections&start=200&end=100&timezone=UTC'
      })
    ).toBeUndefined();
  });

  it('distinguishes plain AI chat from invalid or unsupported target-looking URLs', () => {
    expect(parseAgentTargetContextFromLocation({ pathname: '/ai', search: '' })).toEqual({
      kind: 'none',
      key: 'none'
    });
    for (const search of [
      '?entityId=73',
      '?source=entity&entityId=0',
      '?source=entity&entityId=73&authority=forged',
      '?alertId=9',
      '?source=groupAlert&alertId=9',
      '?source=singleAlert&alertId=0',
      '?source=singleAlert&alertId=9&authority=forged',
      '?focusEntityId=81&nodeId=service%3Acheckout',
      '?source=topology&focusEntityId=10&depth=2&sourceKind=entity-relation&hideInternal=false&pageIndex=0',
      '?source=topology&focusEntityId=10&nodeId=one&edgeId=two&depth=2&sourceKind=entity-relation' +
        '&hideInternal=false&pageIndex=0&pageSize=25',
      '?source=topology&focusEntityId=10&depth=2&sourceKind=entity-relation&start=bad&end=also-bad' +
        '&hideInternal=false&pageIndex=0&pageSize=25',
      '?source=trace&traceId=trace-42&start=1000',
      '?source=trace&traceId=trace-42&start=1000&end=2000&authority=forged',
      '?source=trace&traceId=bad%20trace&start=1000&end=2000',
      '?source=log&start=1000&end=2000&hideInternal=false&hideNoise=false&pageIndex=0',
      '?source=log&start=1000&end=2000&hideInternal=false&hideNoise=false&pageIndex=0&pageSize=20&authority=forged',
      '?source=log&start=1000&end=2000&severityText=NOTICE&hideInternal=false&hideNoise=false&pageIndex=0&pageSize=20',
      '?monitorId=42&signal=metrics&query=basic.bad%20field&start=100&end=200&timezone=UTC',
      '?monitorId=42&signal=metrics&query=basic.value&start=100&end=200&timezone=not%2Fa-zone',
      `?monitorId=42&signal=metrics&query=basic.value&start=1&end=${12 * 7 * 24 * 60 * 60_000 + 2}&timezone=UTC`
    ]) {
      expect(parseAgentTargetContextFromLocation({ pathname: '/ai', search })).toMatchObject({ kind: 'invalid' });
    }
  });
});
