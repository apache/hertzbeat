/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import type { AlertRecord } from '@/features/alert';

export type AppCount = {
  app: string;
  category: string;
  size: number;
  availableSize: number;
  unAvailableSize: number;
  unManageSize: number;
};
export type DashboardSummary = { apps: AppCount[] | null };
export type DashboardAlertSummary = {
  total: number;
  dealNum: number;
  rate: number;
  priorityWarningNum: number;
  priorityCriticalNum: number;
  priorityEmergencyNum: number;
};
export type DashboardMonitorState =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'permission' }
  | { kind: 'unavailable' }
  | { kind: 'contract' }
  | { kind: 'error' }
  | { kind: 'ready' | 'empty'; apps: AppCount[] };
export type DashboardAlertState =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'permission' }
  | { kind: 'unavailable' }
  | { kind: 'contract' }
  | { kind: 'error' }
  | { kind: 'ready' | 'empty'; summary: DashboardAlertSummary };
export type DashboardRecentAlertState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'permission' }
  | { kind: 'unavailable' }
  | { kind: 'contract' }
  | { kind: 'error' }
  | { kind: 'ready'; records: AlertRecord[]; total: number };

export class DashboardContractError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DashboardContractError';
  }
}

export type DashboardFailureKind = 'permission' | 'unavailable' | 'contract' | 'error';
export type DashboardFailureStateKind = 'missing' | DashboardFailureKind;

const dashboardFailureStateKinds = new Set<DashboardFailureStateKind>([
  'missing',
  'permission',
  'unavailable',
  'contract',
  'error'
]);

/** Stable request evidence emitted by the Dashboard API boundary. */
export class DashboardRequestFailure extends Error {
  constructor(readonly kind: DashboardFailureKind) {
    super('Dashboard request failed');
    this.name = 'DashboardRequestFailure';
  }
}

export function dashboardFailureKind(error: unknown): DashboardFailureKind {
  if (error instanceof DashboardContractError) return 'contract';
  return error instanceof DashboardRequestFailure ? error.kind : 'error';
}

/** Keeps Dashboard evidence renderers aligned when a new failure state is introduced. */
export function isDashboardFailureState(
  state: DashboardMonitorState | DashboardAlertState | DashboardRecentAlertState
): state is Extract<
  DashboardMonitorState | DashboardAlertState | DashboardRecentAlertState,
  { kind: DashboardFailureStateKind }
> {
  return dashboardFailureStateKinds.has(state.kind as DashboardFailureStateKind);
}

export function monitorTotals(apps: AppCount[]) {
  return apps.reduce(
    (total, app) => ({
      total: total.total + app.size,
      available: total.available + app.availableSize,
      unavailable: total.unavailable + app.unAvailableSize,
      unmanaged: total.unmanaged + app.unManageSize
    }),
    { total: 0, available: 0, unavailable: 0, unmanaged: 0 }
  );
}
