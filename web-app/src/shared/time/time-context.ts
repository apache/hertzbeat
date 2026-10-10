/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
