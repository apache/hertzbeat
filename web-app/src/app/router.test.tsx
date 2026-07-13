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

import type { RouteObject } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { appRoutes } from './router';

function flattenRoutes(routes: RouteObject[]): RouteObject[] {
  return routes.flatMap(route => [route, ...flattenRoutes(route.children ?? [])]);
}

describe('application data router', () => {
  it('keeps public and protected entry routes in one inspectable route tree', () => {
    const routes = flattenRoutes(appRoutes);
    const paths = routes.map(route => route.path).filter(Boolean);

    expect(paths).toEqual(
      expect.arrayContaining([
        '/passport/login',
        '/status',
        '/dashboard',
        '/monitors',
        '/alerts',
        '/alerts/groups',
        '/alerts/inhibits',
        '/alerts/silences',
        '/alerts/notifications/receivers',
        '/alerts/notifications/templates',
        '/bulletin',
        '*'
      ])
    );
  });

  it('provides a shared route error boundary', () => {
    expect(appRoutes).toHaveLength(1);
    expect(appRoutes[0]?.errorElement).toBeDefined();
  });
});
