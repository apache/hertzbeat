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

import {
  alertRoutePaths,
  applicationRoutePaths,
  buildAlertIntegrationPath,
  monitorRoutePaths
} from '@/shared/navigation/app-paths';
import { settingsPaths } from '@/shared/settings/settings-routes';

export type AppRouteDefinition = {
  id: string;
  path: string;
  layout: 'basic' | 'blank' | 'passport';
  kind: 'page' | 'redirect';
  resource?: {
    labelKey: string;
    listPath?: string;
  };
};

type AppRouteOptions = Partial<Pick<AppRouteDefinition, 'layout' | 'resource'>>;
type AppRouteResource = NonNullable<AppRouteDefinition['resource']>;
type ResourceRouteOptions = AppRouteOptions & { resource: AppRouteResource };
type ResourceRouteDefinition = AppRouteDefinition & { resource: AppRouteResource };

export const applicationRootPath = '/';

export const appRouteCatalog = {
  dashboard: pageRoute('dashboard', applicationRoutePaths.dashboard, {
    resource: { labelKey: 'menu.dashboard' }
  }),
  monitors: pageRoute('monitors', monitorRoutePaths.list, {
    resource: { labelKey: 'menu.monitors' }
  }),
  'monitor-new': pageRoute('monitor-new', monitorRoutePaths.create),
  'monitor-edit': pageRoute('monitor-edit', monitorRoutePaths.edit),
  'monitor-detail': pageRoute('monitor-detail', monitorRoutePaths.detail),
  explore: pageRoute('explore', applicationRoutePaths.explore, {
    resource: { labelKey: 'menu.explore' }
  }),
  instrumentation: pageRoute('instrumentation', '/observability/integration', {
    resource: { labelKey: 'instrumentation.menu' }
  }),
  alerts: pageRoute('alerts', alertRoutePaths.center, {
    resource: { labelKey: 'menu.alerts' }
  }),
  'alert-rules': pageRoute('alert-rules', alertRoutePaths.rules, {
    resource: { labelKey: 'alertRules.title' }
  }),
  'alert-rule-new': pageRoute('alert-rule-new', alertRoutePaths.ruleNew),
  'alert-rule-edit': pageRoute('alert-rule-edit', alertRoutePaths.ruleEdit),
  'alert-groups': pageRoute('alert-groups', alertRoutePaths.groups, {
    resource: { labelKey: 'alertGroups.title' }
  }),
  'alert-inhibits': pageRoute('alert-inhibits', alertRoutePaths.inhibits, {
    resource: { labelKey: 'alertInhibits.title' }
  }),
  'alert-silences': pageRoute('alert-silences', alertRoutePaths.silences, {
    resource: { labelKey: 'alertSilences.title' }
  }),
  'alert-integrations': pageRoute('alert-integrations', alertRoutePaths.integrations, {
    resource: { labelKey: 'alertIntegrations.menu', listPath: buildAlertIntegrationPath('webhook') }
  }),
  settings: redirectRoute('settings', settingsPaths.root, {
    resource: { labelKey: 'menu.settings' }
  }),
  'notice-receivers': pageRoute('notice-receivers', settingsPaths.receivers, {
    resource: { labelKey: 'settingsNavigation.receivers' }
  }),
  'notice-rules': pageRoute('notice-rules', settingsPaths.rules, {
    resource: { labelKey: 'settingsNavigation.rules' }
  }),
  'notice-templates': pageRoute('notice-templates', settingsPaths.templates, {
    resource: { labelKey: 'settingsNavigation.templates' }
  }),
  'message-server': pageRoute('message-server', settingsPaths.channels, {
    resource: { labelKey: 'settingsNavigation.channels' }
  }),
  tokens: pageRoute('tokens', settingsPaths.tokens, {
    resource: { labelKey: 'settingsNavigation.tokens' }
  }),
  collectors: pageRoute('collectors', settingsPaths.collectors, {
    resource: { labelKey: 'settingsNavigation.collectors' }
  }),
  plugins: pageRoute('plugins', settingsPaths.plugins, {
    resource: { labelKey: 'settingsNavigation.plugins' }
  }),
  'monitor-definitions': pageRoute('monitor-definitions', settingsPaths.monitorDefinitions, {
    resource: { labelKey: 'settingsNavigation.monitorDefinitions' }
  }),
  'system-settings': pageRoute('system-settings', settingsPaths.system, {
    resource: { labelKey: 'settingsNavigation.system' }
  }),
  labels: pageRoute('labels', settingsPaths.labels, {
    resource: { labelKey: 'settingsNavigation.labels' }
  }),
  'object-store': pageRoute('object-store', settingsPaths.objectStore, {
    resource: { labelKey: 'settingsNavigation.objectStore' }
  }),
  'status-management': pageRoute('status-management', settingsPaths.statusPage, {
    resource: { labelKey: 'settingsNavigation.statusPage' }
  }),
  bulletin: pageRoute('bulletin', '/bulletin', {
    resource: { labelKey: 'menu.bulletin' }
  }),
  status: pageRoute('status', applicationRoutePaths.status, { layout: 'blank' }),
  login: pageRoute('login', applicationRoutePaths.login, { layout: 'passport' }),
  lock: pageRoute('lock', applicationRoutePaths.lock, { layout: 'passport' }),
  'not-found': pageRoute('not-found', '*')
} as const satisfies Record<string, AppRouteDefinition>;

export type AppRouteId = keyof typeof appRouteCatalog;
export type AppResourceRouteId = {
  [RouteId in AppRouteId]: (typeof appRouteCatalog)[RouteId] extends ResourceRouteDefinition ? RouteId : never;
}[AppRouteId];

export type LegacyRouteDefinition = {
  id: `legacy-${string}`;
  path: string;
  targetRouteId: AppRouteId;
  fixedSearch: readonly (readonly [string, string])[];
};

export const legacyRouteCatalog = [
  legacyRoute('legacy-overview', '/overview', 'dashboard'),
  legacyRoute('legacy-log-stream', '/log/stream', 'explore', [
    ['signal', 'logs'],
    ['mode', 'live']
  ]),
  legacyRoute('legacy-log-integration', '/log/integration/:source', 'instrumentation'),
  legacyRoute('legacy-log-manage', '/log/manage', 'explore', [['signal', 'logs']]),
  legacyRoute('legacy-ingestion-otlp', '/ingestion/otlp', 'instrumentation'),
  legacyRoute('legacy-ingestion-otlp-child', '/ingestion/otlp/*', 'instrumentation'),
  legacyRoute('legacy-notice-receivers', '/alerts/notifications/receivers', 'notice-receivers'),
  legacyRoute('legacy-notice-templates', '/alerts/notifications/templates', 'notice-templates'),
  legacyRoute('legacy-notice-rules', '/alerts/notifications/rules', 'notice-rules'),
  legacyRoute('legacy-message-server', '/setting/settings/server', 'message-server'),
  legacyRoute('legacy-system-settings', '/setting/settings/config', 'system-settings'),
  legacyRoute('legacy-labels', '/setting/labels', 'labels'),
  legacyRoute('legacy-object-store', '/setting/settings/object-store', 'object-store'),
  legacyRoute('legacy-plugins', '/setting/plugin', 'plugins'),
  legacyRoute('legacy-monitor-definitions', '/setting/define', 'monitor-definitions'),
  legacyRoute('legacy-status-management', '/setting/status', 'status-management')
] as const satisfies readonly LegacyRouteDefinition[];

export const routeRegistry = Object.values(appRouteCatalog);

export function getAppRoute<RouteId extends AppRouteId>(id: RouteId) {
  return appRouteCatalog[id];
}

export function getAppRouteIdentity(id: AppRouteId) {
  const definition = getAppRoute(id);
  return { id: definition.id, path: definition.path };
}

function pageRoute(id: string, path: string, options: ResourceRouteOptions): ResourceRouteDefinition;
function pageRoute(id: string, path: string, options?: AppRouteOptions): AppRouteDefinition;
function pageRoute(id: string, path: string, options: AppRouteOptions = {}): AppRouteDefinition {
  return {
    id,
    path,
    layout: options.layout ?? 'basic',
    kind: 'page',
    ...(options.resource ? { resource: options.resource } : {})
  };
}

function redirectRoute(id: string, path: string, options: ResourceRouteOptions): ResourceRouteDefinition;
function redirectRoute(id: string, path: string, options?: AppRouteOptions): AppRouteDefinition;
function redirectRoute(id: string, path: string, options: AppRouteOptions = {}): AppRouteDefinition {
  return { ...pageRoute(id, path, options), kind: 'redirect' as const };
}

function legacyRoute(
  id: LegacyRouteDefinition['id'],
  path: string,
  targetRouteId: AppRouteId,
  fixedSearch: LegacyRouteDefinition['fixedSearch'] = []
): LegacyRouteDefinition {
  return { id, path, targetRouteId, fixedSearch };
}
