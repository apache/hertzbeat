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

import { defaultAuthenticatedPath, loginPath, sessionLockPath } from '@/core/auth/navigation';

const alertCenterPath = '/alerts';
const alertRuleListPath = `${alertCenterPath}/rules`;
const alertIntegrationPath = `${alertCenterPath}/integrations/:source`;
const monitorListPath = '/monitors';
const entityListPath = '/entities';

export const applicationRoutePaths = {
  dashboard: defaultAuthenticatedPath,
  aiWorkspace: '/ai',
  aiSchedules: '/ai/schedules',
  instrumentation: '/observability/integration',
  topology: '/topology',
  explore: '/explore',
  status: '/status',
  login: loginPath,
  lock: sessionLockPath
} as const;

export const monitorRoutePaths = {
  list: monitorListPath,
  create: `${monitorListPath}/new`,
  detail: `${monitorListPath}/:monitorId`,
  edit: `${monitorListPath}/:monitorId/edit`
} as const;

export const entityRoutePaths = {
  list: entityListPath,
  discovery: `${entityListPath}/discovery`,
  import: `${entityListPath}/import`,
  create: `${entityListPath}/new`,
  detail: `${entityListPath}/:entityId`,
  edit: `${entityListPath}/:entityId/edit`,
  definition: `${entityListPath}/:entityId/definition`
} as const;

/** Alert path templates shared by route registration and feature navigation. */
export const alertRoutePaths = {
  center: alertCenterPath,
  rules: alertRuleListPath,
  ruleNew: `${alertRuleListPath}/new`,
  ruleEdit: `${alertRuleListPath}/:ruleId/edit`,
  groups: `${alertCenterPath}/groups`,
  inhibits: `${alertCenterPath}/inhibits`,
  silences: `${alertCenterPath}/silences`,
  integrations: alertIntegrationPath
} as const;

/** Builds the new-rule route only after the operator has selected its evaluation strategy. */
export function buildAlertRuleNewPath(kind: 'realtime' | 'periodic') {
  return `${alertRoutePaths.ruleNew}?${new URLSearchParams({ kind }).toString()}`;
}

const alertReturnStatuses = ['firing', 'acknowledged', 'resolved'];
const alertReturnSeverities = ['info', 'warning', 'critical', 'emergency'];

/** Returns undefined unless the target is the exact same-origin Alert Center route. */
export function normalizeAlertCenterReturnTo(value: string | null | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value, 'http://hertzbeat.local');
    if (url.origin !== 'http://hertzbeat.local' || url.pathname !== alertCenterPath) return undefined;
    const output = new URLSearchParams();
    for (const field of ['search', 'serviceName', 'serviceNamespace', 'environment']) {
      const text = url.searchParams.get(field)?.trim();
      if (text) output.set(field, text);
    }
    appendAlertReturnEnum(output, url.searchParams, 'status', alertReturnStatuses);
    appendAlertReturnEnum(output, url.searchParams, 'severity', alertReturnSeverities);
    appendAlertReturnPage(output, url.searchParams, 'pageIndex', 0);
    appendAlertReturnPage(output, url.searchParams, 'pageSize', 8, [8, 15, 25]);
    const search = output.toString();
    return search ? `${alertCenterPath}?${search}` : alertCenterPath;
  } catch {
    return undefined;
  }
}

function appendAlertReturnEnum(output: URLSearchParams, input: URLSearchParams, field: string, allowed: string[]) {
  const value = input.get(field)?.trim().toLowerCase();
  if (value && allowed.includes(value)) output.set(field, value);
}

function appendAlertReturnPage(
  output: URLSearchParams,
  input: URLSearchParams,
  field: string,
  fallback: number,
  allowed?: number[]
) {
  if (!input.has(field)) return;
  const value = Number(input.get(field));
  output.set(
    field,
    String(Number.isSafeInteger(value) && value >= 0 && (!allowed || allowed.includes(value)) ? value : fallback)
  );
}

export function buildAlertIntegrationPath(source: string) {
  return alertIntegrationPath.replace(':source', encodeURIComponent(source));
}

export function buildAlertRuleEditPath(ruleId: number) {
  return alertRoutePaths.ruleEdit.replace(':ruleId', String(ruleId));
}

export type MonitorListRouteContext = {
  app?: string;
  labels?: string;
};

export type MonitorCreateRouteContext = {
  returnTo?: string;
};

/** Builds the Monitor creation target from its canonical route and safe return path. */
export function buildMonitorCreatePath(context: MonitorCreateRouteContext = {}) {
  const params = new URLSearchParams();
  if (context.returnTo !== undefined) params.set('returnTo', context.returnTo);
  const search = params.toString();
  return search ? `${monitorRoutePaths.create}?${search}` : monitorRoutePaths.create;
}

/** Builds only the public Monitor filters that are safe to carry in a URL. */
export function buildMonitorListPath(context: MonitorListRouteContext = {}) {
  const params = new URLSearchParams();
  if (context.app !== undefined) params.set('app', context.app);
  if (context.labels !== undefined) params.set('labels', context.labels);
  const search = params.toString();
  return search ? `${monitorRoutePaths.list}?${search}` : monitorRoutePaths.list;
}

export function buildMonitorDetailPath(monitorId: number) {
  return monitorRoutePaths.detail.replace(':monitorId', String(monitorId));
}

export function buildMonitorEditPath(monitorId: number) {
  return monitorRoutePaths.edit.replace(':monitorId', String(monitorId));
}

export function buildEntityEditPath(entityId: number) {
  return entityRoutePaths.edit.replace(':entityId', String(entityId));
}

export function buildEntityDetailPath(entityId: number, returnTo?: string) {
  const path = entityRoutePaths.detail.replace(':entityId', String(entityId));
  return returnTo ? `${path}?returnTo=${encodeURIComponent(returnTo)}` : path;
}
