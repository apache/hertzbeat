/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { ExactTimeWindow } from '@/shared/query-context';

export type TimeOwnership = 'global' | 'route_owned' | 'none' | 'unknown';
export type GlobalTimeRange = '15m' | '30m' | '1h' | '6h' | '24h';
export type HeaderTimeMode = 'global_controls' | 'exact_window' | 'hidden';
export type ManualRefreshOwner = 'time_revision' | 'active_queries';

export type GlobalTimeState = {
  range: GlobalTimeRange;
  rangeMs: number;
  autoRefreshMs: number;
  anchorMs: number;
  remainingMs: number | null;
  refreshRevision: number;
};

export type RouteTimeState = {
  policy: TimeOwnership;
  window: ExactTimeWindow | undefined;
  refreshRevision: number;
};

export const globalTimeRanges: GlobalTimeRange[] = ['15m', '30m', '1h', '6h', '24h'];
export const globalAutoRefreshValues = [0, 30_000, 60_000] as const;

const rangeMilliseconds: Record<GlobalTimeRange, number> = {
  '15m': 15 * 60_000,
  '30m': 30 * 60_000,
  '1h': 60 * 60_000,
  '6h': 6 * 60 * 60_000,
  '24h': 24 * 60 * 60_000
};

export function createGlobalTimeState(nowMs: number): GlobalTimeState {
  return {
    range: '30m',
    rangeMs: rangeMilliseconds['30m'],
    autoRefreshMs: 0,
    anchorMs: nowMs,
    remainingMs: null,
    refreshRevision: 0
  };
}

export function updateGlobalRange(state: GlobalTimeState, range: GlobalTimeRange, nowMs: number): GlobalTimeState {
  return { ...state, range, rangeMs: rangeMilliseconds[range], anchorMs: nowMs };
}

export function updateGlobalAutoRefresh(state: GlobalTimeState, autoRefreshMs: number, nowMs: number): GlobalTimeState {
  if (!globalAutoRefreshValues.includes(autoRefreshMs as (typeof globalAutoRefreshValues)[number])) {
    throw new Error('Unsupported global auto-refresh interval');
  }
  return {
    ...state,
    autoRefreshMs,
    anchorMs: nowMs,
    remainingMs: autoRefreshMs > 0 ? autoRefreshMs : null
  };
}

export function tickGlobalTime(state: GlobalTimeState, nowMs: number): GlobalTimeState {
  if (state.autoRefreshMs <= 0) return state;
  const dueAt = state.anchorMs + state.autoRefreshMs;
  if (nowMs < dueAt) return { ...state, remainingMs: dueAt - nowMs };
  return {
    ...state,
    anchorMs: nowMs,
    remainingMs: state.autoRefreshMs,
    refreshRevision: state.refreshRevision + 1
  };
}

export function refreshGlobalTime(state: GlobalTimeState, nowMs: number): GlobalTimeState {
  return {
    ...state,
    anchorMs: nowMs,
    remainingMs: state.autoRefreshMs > 0 ? state.autoRefreshMs : null,
    refreshRevision: state.refreshRevision + 1
  };
}

export function globalTimeWindow(state: GlobalTimeState): ExactTimeWindow {
  return { from: state.anchorMs - state.rangeMs, to: state.anchorMs };
}

export function createRouteTimeState(policy: TimeOwnership, inherited: ExactTimeWindow): RouteTimeState {
  return {
    policy,
    window: policy === 'global' || policy === 'route_owned' ? { ...inherited } : undefined,
    refreshRevision: 0
  };
}

export function commitRouteWindow(state: RouteTimeState, window: ExactTimeWindow): RouteTimeState {
  requireExactWindow(window);
  if (state.policy !== 'route_owned') return state;
  if (state.window?.from === window.from && state.window.to === window.to) return state;
  return { ...state, window: { ...window } };
}

export function headerTimeMode(policy: TimeOwnership): HeaderTimeMode {
  if (policy === 'global') return 'global_controls';
  if (policy === 'route_owned') return 'exact_window';
  return 'hidden';
}

export function manualRefreshOwner(policy: TimeOwnership): ManualRefreshOwner {
  return policy === 'global' || policy === 'route_owned' ? 'time_revision' : 'active_queries';
}

export function parseExactTimeWindow(params: URLSearchParams): ExactTimeWindow | undefined {
  const from = readTimestamp(params.get('start'));
  const to = readTimestamp(params.get('end'));
  return from != null && to != null && from < to ? { from, to } : undefined;
}

export function hasExactTimeWindowFields(params: URLSearchParams) {
  return params.has('start') || params.has('end');
}

export function writeExactTimeWindow(params: URLSearchParams, window: ExactTimeWindow) {
  requireExactWindow(window);
  const next = new URLSearchParams(params);
  next.set('start', String(window.from));
  next.set('end', String(window.to));
  return next;
}

export function clearExactTimeWindow(params: URLSearchParams) {
  const next = new URLSearchParams(params);
  next.delete('start');
  next.delete('end');
  return next;
}

function requireExactWindow(window: ExactTimeWindow) {
  if (
    !Number.isSafeInteger(window.from) ||
    !Number.isSafeInteger(window.to) ||
    window.from <= 0 ||
    window.from >= window.to
  ) {
    throw new Error('Invalid exact time window');
  }
}

function readTimestamp(value: string | null) {
  if (!value || !/^\d+$/u.test(value)) return undefined;
  const timestamp = Number(value);
  return Number.isSafeInteger(timestamp) && timestamp > 0 ? timestamp : undefined;
}
