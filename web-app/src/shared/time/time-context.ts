/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { createContext, useContext } from 'react';

import type { ExactTimeWindow } from '@/shared/query-context';

import type { GlobalTimeRange, HeaderTimeMode, ManualRefreshOwner, TimeOwnership } from './time-model';

export type SharedTimeValue = {
  policy: TimeOwnership;
  headerMode: HeaderTimeMode;
  manualRefreshOwner: ManualRefreshOwner;
  window: ExactTimeWindow | undefined;
  range: GlobalTimeRange;
  autoRefreshMs: number;
  remainingMs: number | null;
  refreshRevision: number;
  setRange: (range: GlobalTimeRange) => void;
  setAutoRefresh: (intervalMs: number) => void;
  commitWindow: (window: ExactTimeWindow) => void;
  requestRefresh: () => void;
};

export const RouteTimeContext = createContext<SharedTimeValue | null>(null);

export function useSharedTime() {
  const value = useContext(RouteTimeContext);
  if (!value) throw new Error('RouteTimeProvider is missing');
  return value;
}

export function useSharedTimeOptional() {
  return useContext(RouteTimeContext);
}
