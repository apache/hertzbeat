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
export type AppCount = {
  app: string; category: string; size: number; availableSize: number; unAvailableSize: number; unManageSize: number;
};
export type DashboardSummary = { apps: AppCount[] | null };
export type DashboardAlertSummary = {
  total: number; dealNum: number; rate: number; priorityWarningNum: number;
  priorityCriticalNum: number; priorityEmergencyNum: number;
};
export type DashboardData = { apps: AppCount[]; alert: DashboardAlertSummary };

export class DashboardContractError extends Error {
  constructor(message: string) { super(message); this.name = 'DashboardContractError'; }
}

export function parseDashboardSummary(value: unknown): DashboardSummary {
  const root = record(value, 'dashboard summary');
  if (!Object.prototype.hasOwnProperty.call(root, 'apps')) fail('dashboard apps is required');
  if (root.apps === null) return { apps: null };
  if (!Array.isArray(root.apps)) fail('dashboard apps must be an array or null');
  return { apps: root.apps.map(parseAppCount) };
}

export function parseAlertSummary(value: unknown): DashboardAlertSummary {
  const root = record(value, 'alert summary');
  return {
    total: count(root.total, 'total'), dealNum: count(root.dealNum, 'dealNum'), rate: nonNegative(root.rate, 'rate'),
    priorityWarningNum: count(root.priorityWarningNum, 'priorityWarningNum'),
    priorityCriticalNum: count(root.priorityCriticalNum, 'priorityCriticalNum'),
    priorityEmergencyNum: count(root.priorityEmergencyNum, 'priorityEmergencyNum')
  };
}

export function monitorTotals(apps: AppCount[]) {
  return apps.reduce((total, app) => ({ total: total.total + app.size,
    available: total.available + app.availableSize, unavailable: total.unavailable + app.unAvailableSize,
    unmanaged: total.unmanaged + app.unManageSize }), { total: 0, available: 0, unavailable: 0, unmanaged: 0 });
}

function parseAppCount(value: unknown): AppCount {
  const app = record(value, 'application count');
  return { app: text(app.app, 'app'), category: text(app.category, 'category'), size: count(app.size, 'size'),
    availableSize: count(app.availableSize, 'availableSize'), unAvailableSize: count(app.unAvailableSize, 'unAvailableSize'),
    unManageSize: count(app.unManageSize, 'unManageSize') };
}
function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} must be a non-empty string`);
  return value.trim();
}
function count(value: unknown, label: string) { if (!Number.isSafeInteger(value) || (value as number) < 0) fail(`${label} must be a non-negative integer`); return value as number; }
function nonNegative(value: unknown, label: string) { if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) fail(`${label} must be non-negative`); return value; }
function fail(message: string): never { throw new DashboardContractError(message); }
