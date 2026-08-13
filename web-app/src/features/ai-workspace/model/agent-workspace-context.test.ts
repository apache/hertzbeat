/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { buildAgentWorkspacePath, deriveAgentTargetFromLocation } from './agent-workspace-context';

describe('Agent workspace context handoff', () => {
  it.each([
    ['/monitors/42', '', { monitorId: 42 }],
    ['/entities/73', '', { entityId: 73 }],
    [
      '/explore',
      '?signal=logs&query=service%3Dcheckout&timeRange=last-1h&start=1000&end=2000',
      { signal: { type: 'logs', query: 'service=checkout', timeRange: 'last-1h', start: 1000, end: 2000 } }
    ],
    [
      '/topology',
      '?focusEntityId=81&nodeId=service%3Acheckout&depth=2',
      { topology: { rootEntityId: 81, nodeId: 'service:checkout', depth: 2 } }
    ]
  ])('derives a bounded target from %s%s', (pathname, search, expected) => {
    expect(deriveAgentTargetFromLocation({ pathname, search })).toEqual(expected);
  });

  it('does not turn editor, malformed, or private query state into an Agent target', () => {
    expect(deriveAgentTargetFromLocation({ pathname: '/monitors/42/edit', search: '' })).toBeUndefined();
    expect(deriveAgentTargetFromLocation({ pathname: '/entities/not-a-number', search: '' })).toBeUndefined();
    expect(
      deriveAgentTargetFromLocation({
        pathname: '/explore',
        search: '?signal=private&query=ignored&password=secret'
      })
    ).toBeUndefined();
  });

  it('round-trips an explicit cross-product handoff without carrying a return URL or private state', () => {
    const path = buildAgentWorkspacePath({
      signal: { type: 'metrics', query: 'service=checkout', timeRange: 'last-30m' }
    });
    expect(path).toBe('/ai?signal=metrics&query=service%3Dcheckout&timeRange=last-30m');
    const url = new URL(path, 'http://localhost');
    expect(deriveAgentTargetFromLocation(url)).toEqual({
      signal: { type: 'metrics', query: 'service=checkout', timeRange: 'last-30m' }
    });
  });
});
