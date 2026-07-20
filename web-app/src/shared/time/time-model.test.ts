/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  commitRouteWindow,
  createGlobalTimeState,
  createRouteTimeState,
  globalTimeWindow,
  headerTimeMode,
  manualRefreshOwner,
  refreshGlobalTime,
  tickGlobalTime,
  updateGlobalAutoRefresh,
  updateGlobalRange
} from './time-model';

describe('shared time ownership model', () => {
  it('owns range, auto-refresh remaining time, immediate refresh, and rolling global windows', () => {
    let state = createGlobalTimeState(100_000);
    state = updateGlobalRange(state, '15m', 100_000);
    state = updateGlobalAutoRefresh(state, 30_000, 100_000);
    expect(globalTimeWindow(state)).toEqual({ from: -800_000, to: 100_000 });
    expect(tickGlobalTime(state, 119_000)).toMatchObject({ remainingMs: 11_000, refreshRevision: 0 });
    state = tickGlobalTime(state, 130_000);
    expect(state).toMatchObject({ anchorMs: 130_000, remainingMs: 30_000, refreshRevision: 1 });
    expect(refreshGlobalTime(state, 131_000)).toMatchObject({ anchorMs: 131_000, refreshRevision: 2 });
  });

  it('lets route-owned time inherit once, then freeze an independent committed window', () => {
    const global = globalTimeWindow(createGlobalTimeState(2_000_000));
    let route = createRouteTimeState('route_owned', global);
    expect(route.window).toEqual(global);
    route = commitRouteWindow(route, { from: 10_000, to: 20_000 });
    expect(route).toMatchObject({ policy: 'route_owned', window: { from: 10_000, to: 20_000 } });
    expect(route.window).not.toEqual(globalTimeWindow(refreshGlobalTime(createGlobalTimeState(2_000_000), 3_000_000)));
  });

  it('gives global, route-owned, and none distinct honest header modes', () => {
    expect(headerTimeMode('global')).toBe('global_controls');
    expect(headerTimeMode('route_owned')).toBe('exact_window');
    expect(headerTimeMode('none')).toBe('hidden');
    expect(headerTimeMode('unknown')).toBe('hidden');
  });

  it('assigns exactly one manual refresh owner for every time policy', () => {
    expect(manualRefreshOwner('global')).toBe('time_revision');
    expect(manualRefreshOwner('route_owned')).toBe('time_revision');
    expect(manualRefreshOwner('none')).toBe('active_queries');
    expect(manualRefreshOwner('unknown')).toBe('active_queries');
  });
});
