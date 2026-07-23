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
  create: `${entityListPath}/new`,
  detail: `${entityListPath}/:entityId`,
  edit: `${entityListPath}/:entityId/edit`
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
