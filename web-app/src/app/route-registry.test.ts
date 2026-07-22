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

import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  appRouteCatalog,
  applicationRootPath,
  getAppRoute,
  legacyRouteCatalog,
  routeRegistry,
  type AppResourceRouteId
} from './route-registry';

describe('route registry', () => {
  it('keeps route ids and paths unique', () => {
    expect(applicationRootPath).toBe('/');
    expect(Object.entries(appRouteCatalog).every(([key, route]) => key === route.id)).toBe(true);
    expect(new Set(routeRegistry.map(route => route.id)).size).toBe(routeRegistry.length);
    expect(new Set(routeRegistry.map(route => route.path)).size).toBe(routeRegistry.length);
  });

  it('owns every legacy business mapping and fixed query in one catalog', () => {
    expect(
      legacyRouteCatalog.map(({ id, path, targetRouteId, fixedSearch }) => ({
        id,
        path,
        targetRouteId,
        fixedSearch
      }))
    ).toEqual(
      expect.arrayContaining([
        { id: 'legacy-overview', path: '/overview', targetRouteId: 'dashboard', fixedSearch: [] },
        {
          id: 'legacy-log-stream',
          path: '/log/stream',
          targetRouteId: 'explore',
          fixedSearch: [
            ['signal', 'logs'],
            ['mode', 'live']
          ]
        },
        {
          id: 'legacy-log-integration',
          path: '/log/integration/:source',
          targetRouteId: 'instrumentation',
          fixedSearch: []
        },
        {
          id: 'legacy-log-manage',
          path: '/log/manage',
          targetRouteId: 'explore',
          fixedSearch: [['signal', 'logs']]
        },
        {
          id: 'legacy-ingestion-otlp',
          path: '/ingestion/otlp',
          targetRouteId: 'instrumentation',
          fixedSearch: []
        },
        {
          id: 'legacy-ingestion-otlp-child',
          path: '/ingestion/otlp/*',
          targetRouteId: 'instrumentation',
          fixedSearch: []
        }
      ])
    );
  });

  it('defines every monitor and alert-rule workflow page in the canonical catalog', () => {
    expect([
      getAppRoute('monitor-new'),
      getAppRoute('monitor-edit'),
      getAppRoute('monitor-detail'),
      getAppRoute('alert-rule-new'),
      getAppRoute('alert-rule-edit')
    ]).toEqual([
      expect.objectContaining({ id: 'monitor-new', path: '/monitors/new', kind: 'page' }),
      expect.objectContaining({ id: 'monitor-edit', path: '/monitors/:monitorId/edit', kind: 'page' }),
      expect.objectContaining({ id: 'monitor-detail', path: '/monitors/:monitorId', kind: 'page' }),
      expect.objectContaining({ id: 'alert-rule-new', path: '/alerts/rules/new', kind: 'page' }),
      expect.objectContaining({ id: 'alert-rule-edit', path: '/alerts/rules/:ruleId/edit', kind: 'page' })
    ]);
  });

  it('keeps the wildcard route out of Refine shell resources', () => {
    expect(routeRegistry.find(route => route.path === '*')?.resource).toBeUndefined();
  });

  it('limits Refine resource ids to routes with resource metadata', () => {
    expectTypeOf<'dashboard'>().toMatchTypeOf<AppResourceRouteId>();
    expectTypeOf<'monitor-new'>().not.toMatchTypeOf<AppResourceRouteId>();
    expectTypeOf<'login'>().not.toMatchTypeOf<AppResourceRouteId>();
    expectTypeOf<'not-found'>().not.toMatchTypeOf<AppResourceRouteId>();
  });

  it('keeps notification configuration under one settings entry', () => {
    expect(routeRegistry.find(route => route.id === 'settings')?.resource).toBeDefined();
    expect(routeRegistry.find(route => route.id === 'instrumentation')).toMatchObject({
      resource: { labelKey: 'instrumentation.menu' }
    });
  });

  it('registers Collector management at its canonical settings route', () => {
    expect(getAppRoute('collectors')).toMatchObject({
      id: 'collectors',
      path: '/settings/collectors',
      kind: 'page',
      resource: { labelKey: 'settingsNavigation.collectors' }
    });
  });

  it('registers the session lock as a canonical passport-layout page', () => {
    expect(getAppRoute('lock')).toEqual({ id: 'lock', path: '/passport/lock', layout: 'passport', kind: 'page' });
  });
});
