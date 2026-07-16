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

import { settingsPaths } from '@/shared/settings/settings-routes';

export type AppRouteDefinition = {
  id: string;
  path: string;
  labelKey: string;
  layout: 'basic' | 'blank' | 'passport';
  navigation: boolean;
};

export const routeRegistry = [
  { id: 'root', path: '/', labelKey: 'menu.dashboard', layout: 'basic', navigation: false },
  { id: 'dashboard', path: '/dashboard', labelKey: 'menu.dashboard', layout: 'basic', navigation: true },
  { id: 'monitors', path: '/monitors', labelKey: 'menu.monitors', layout: 'basic', navigation: true },
  { id: 'explore', path: '/explore', labelKey: 'menu.explore', layout: 'basic', navigation: true },
  { id: 'instrumentation', path: '/observability/integration', labelKey: 'instrumentation.menu', layout: 'basic', navigation: true },
  { id: 'alerts', path: '/alerts', labelKey: 'menu.alerts', layout: 'basic', navigation: true },
  { id: 'alert-rules', path: '/alerts/rules', labelKey: 'alertRules.title', layout: 'basic', navigation: false },
  { id: 'alert-groups', path: '/alerts/groups', labelKey: 'alertGroups.title', layout: 'basic', navigation: false },
  { id: 'alert-inhibits', path: '/alerts/inhibits', labelKey: 'alertInhibits.title', layout: 'basic', navigation: false },
  { id: 'alert-silences', path: '/alerts/silences', labelKey: 'alertSilences.title', layout: 'basic', navigation: false },
  { id: 'settings', path: settingsPaths.root, labelKey: 'menu.settings', layout: 'basic', navigation: true },
  { id: 'notice-receivers', path: settingsPaths.receivers, labelKey: 'noticeReceivers.title', layout: 'basic', navigation: false },
  { id: 'notice-rules', path: settingsPaths.rules, labelKey: 'noticeRules.title', layout: 'basic', navigation: false },
  { id: 'notice-templates', path: settingsPaths.templates, labelKey: 'noticeTemplates.title', layout: 'basic', navigation: false },
  { id: 'message-server', path: settingsPaths.channels, labelKey: 'messageServer.title', layout: 'basic', navigation: false },
  { id: 'tokens', path: settingsPaths.tokens, labelKey: 'token.title', layout: 'basic', navigation: false },
  { id: 'system-settings', path: settingsPaths.system, labelKey: 'systemConfig.title', layout: 'basic', navigation: false },
  { id: 'labels', path: settingsPaths.labels, labelKey: 'labels.title', layout: 'basic', navigation: false },
  { id: 'object-store', path: settingsPaths.objectStore, labelKey: 'objectStore.title', layout: 'basic', navigation: false },
  { id: 'bulletin', path: '/bulletin', labelKey: 'menu.bulletin', layout: 'basic', navigation: true },
  { id: 'status', path: '/status', labelKey: 'menu.status', layout: 'blank', navigation: false },
  { id: 'login', path: '/passport/login', labelKey: 'auth.title', layout: 'passport', navigation: false },
  {
    id: 'not-found',
    path: '*',
    labelKey: 'common.notFound.title',
    layout: 'basic',
    navigation: false
  }
] as const satisfies readonly AppRouteDefinition[];
