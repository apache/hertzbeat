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
  { id: 'alerts', path: '/alerts', labelKey: 'menu.alerts', layout: 'basic', navigation: true },
  { id: 'alert-rules', path: '/alerts/rules', labelKey: 'alertRules.title', layout: 'basic', navigation: false },
  { id: 'alert-groups', path: '/alerts/groups', labelKey: 'alertGroups.title', layout: 'basic', navigation: false },
  { id: 'alert-inhibits', path: '/alerts/inhibits', labelKey: 'alertInhibits.title', layout: 'basic', navigation: false },
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
