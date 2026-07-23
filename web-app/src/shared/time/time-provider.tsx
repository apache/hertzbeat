/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type PropsWithChildren
} from 'react';
import { useSearchParams } from 'react-router-dom';

import type { ExactTimeWindow } from '@/shared/query-context';

import { RouteTimeContext, type SharedTimeValue } from './time-context';

import {
  commitRouteWindow,
  clearExactTimeWindow,
  createGlobalTimeState,
  createRouteTimeState,
  globalTimeWindow,
  hasExactTimeWindowFields,
  headerTimeMode,
  manualRefreshOwner,
  parseExactTimeWindow,
  refreshGlobalTime,
  tickGlobalTime,
  updateGlobalAutoRefresh,
  updateGlobalRange,
  writeExactTimeWindow,
  type GlobalTimeRange,
  type GlobalTimeState,
  type TimeOwnership
} from './time-model';

type GlobalAction =
  | { type: 'tick'; nowMs: number }
  | { type: 'refresh'; nowMs: number }
  | { type: 'range'; range: GlobalTimeRange; nowMs: number }
  | { type: 'autoRefresh'; intervalMs: number; nowMs: number };

type GlobalTimeValue = {
  state: GlobalTimeState;
  dispatch: (action: GlobalAction) => void;
};

const GlobalContext = createContext<GlobalTimeValue | null>(null);

export function GlobalTimeProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(globalReducer, undefined, () => createGlobalTimeState(Date.now()));

  useEffect(() => {
    if (state.autoRefreshMs <= 0) return undefined;
    const timer = window.setInterval(() => dispatch({ type: 'tick', nowMs: Date.now() }), 1_000);
    return () => window.clearInterval(timer);
  }, [state.autoRefreshMs]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
}

export function RouteTimeProvider({ children, policy }: PropsWithChildren<{ policy: TimeOwnership }>) {
  const global = useGlobalTime();
  const [params, setParams] = useSearchParams();
  const [inherited] = useState(() => globalTimeWindow(global.state));
  const exact = parseExactTimeWindow(params);
  const invalidExact = policy === 'route_owned' && hasExactTimeWindowFields(params) && !exact;
  // Relative route windows share the rolling refresh cadence; explicit URL windows remain immutable evidence.
  const usesGlobalState = policy === 'global' || (policy === 'route_owned' && !hasExactTimeWindowFields(params));
  const [routeRefreshRevision, bumpRouteRefresh] = useReducer(revision => revision + 1, 0);

  useEffect(() => {
    if (!invalidExact) return;
    setParams(clearExactTimeWindow(params), { replace: true });
  }, [invalidExact, params, setParams]);

  const { commitWindow, requestRefresh, setAutoRefresh, setRange } = useRouteTimeCommands(
    global,
    policy,
    inherited,
    params,
    setParams,
    bumpRouteRefresh,
    usesGlobalState
  );

  const value = useMemo<SharedTimeValue>(() => {
    return {
      policy,
      headerMode: policy === 'route_owned' ? (exact ? 'exact_window' : 'hidden') : headerTimeMode(policy),
      manualRefreshOwner: manualRefreshOwner(policy),
      window: resolveTimeWindow(policy, global.state, exact, inherited, usesGlobalState),
      range: global.state.range,
      autoRefreshMs: usesGlobalState ? global.state.autoRefreshMs : 0,
      remainingMs: usesGlobalState ? global.state.remainingMs : null,
      refreshRevision: usesGlobalState ? global.state.refreshRevision : routeRefreshRevision,
      setRange,
      setAutoRefresh,
      commitWindow,
      requestRefresh
    };
  }, [
    commitWindow,
    exact,
    global.state,
    inherited,
    policy,
    requestRefresh,
    routeRefreshRevision,
    setAutoRefresh,
    setRange,
    usesGlobalState
  ]);

  return <RouteTimeContext.Provider value={value}>{children}</RouteTimeContext.Provider>;
}

function resolveTimeWindow(
  policy: TimeOwnership,
  globalState: GlobalTimeState,
  routeWindow: ExactTimeWindow | undefined,
  inheritedWindow: ExactTimeWindow,
  usesGlobalState: boolean
): ExactTimeWindow | undefined {
  if (usesGlobalState) return globalTimeWindow(globalState);
  if (policy === 'route_owned') return routeWindow ?? inheritedWindow;
  return undefined;
}

function useRouteTimeCommands(
  global: GlobalTimeValue,
  policy: TimeOwnership,
  inherited: ExactTimeWindow,
  params: URLSearchParams,
  setParams: ReturnType<typeof useSearchParams>[1],
  bumpRouteRefresh: () => void,
  usesGlobalState: boolean
) {
  const setRange = useCallback(
    (range: GlobalTimeRange) => global.dispatch({ type: 'range', range, nowMs: Date.now() }),
    [global]
  );
  const setAutoRefresh = useCallback(
    (intervalMs: number) => {
      if (usesGlobalState) global.dispatch({ type: 'autoRefresh', intervalMs, nowMs: Date.now() });
    },
    [global, usesGlobalState]
  );
  const commitWindow = useCallback(
    (window: ExactTimeWindow) => {
      if (policy !== 'route_owned') return;
      commitRouteWindow(createRouteTimeState(policy, inherited), window);
      setParams(writeExactTimeWindow(params, window));
    },
    [inherited, params, policy, setParams]
  );
  const requestRefresh = useCallback(() => {
    if (usesGlobalState) global.dispatch({ type: 'refresh', nowMs: Date.now() });
    else if (policy === 'route_owned') bumpRouteRefresh();
  }, [bumpRouteRefresh, global, policy, usesGlobalState]);
  return { commitWindow, requestRefresh, setAutoRefresh, setRange };
}

function useGlobalTime() {
  const value = useContext(GlobalContext);
  if (!value) throw new Error('GlobalTimeProvider is missing');
  return value;
}

function globalReducer(state: GlobalTimeState, action: GlobalAction) {
  if (action.type === 'tick') return tickGlobalTime(state, action.nowMs);
  if (action.type === 'refresh') return refreshGlobalTime(state, action.nowMs);
  if (action.type === 'range') return updateGlobalRange(state, action.range, action.nowMs);
  return updateGlobalAutoRefresh(state, action.intervalMs, action.nowMs);
}
