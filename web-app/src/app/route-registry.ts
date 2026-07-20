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

import { alertRoutePaths } from '@/shared/navigation/app-paths';
import { settingsPaths } from '@/shared/settings/settings-routes';

export type AppRouteDefinition = {
  id: string;
  path: string;
  layout: 'basic' | 'blank' | 'passport';
  kind: 'page' | 'redirect';
  resource?: {
    labelKey: string;
  };
};

type AppRouteOptions = Partial<Pick<AppRouteDefinition, 'layout' | 'resource'>>;
type AppRouteResource = NonNullable<AppRouteDefinition['resource']>;
type ResourceRouteOptions = AppRouteOptions & { resource: AppRouteResource };
type ResourceRouteDefinition = AppRouteDefinition & { resource: AppRouteResource };

export const applicationRootPath = '/';

export const appRouteCatalog = {
  dashboard: pageRoute('dashboard', '/dashboard', {
    resource: { labelKey: 'menu.dashboard' }
  }),
  monitors: pageRoute('monitors', '/monitors', {
    resource: { labelKey: 'menu.monitors' }
  }),
  'monitor-new': pageRoute('monitor-new', '/monitors/new'),
  'monitor-edit': pageRoute('monitor-edit', '/monitors/:monitorId/edit'),
  'monitor-detail': pageRoute('monitor-detail', '/monitors/:monitorId'),
  explore: pageRoute('explore', '/explore', {
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
  status: pageRoute('status', '/status', { layout: 'blank' }),
  login: pageRoute('login', '/passport/login', { layout: 'passport' }),
  'not-found': pageRoute('not-found', '*')
} as const satisfies Record<string, AppRouteDefinition>;

export type AppRouteId = keyof typeof appRouteCatalog;
export type AppResourceRouteId = {
  [RouteId in AppRouteId]: (typeof appRouteCatalog)[RouteId] extends ResourceRouteDefinition ? RouteId : never;
}[AppRouteId];

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
