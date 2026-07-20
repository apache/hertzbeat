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
import { isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import { AuthGate } from '@/core/auth/auth-gate';
import { loadTokenPageRoute } from '@/features/settings/token';
import { legacySettingsPaths } from '@/shared/settings/settings-routes';

import { applicationRootPath, getAppRoute, routeRegistry, type AppRouteId } from './route-registry';
import { appRoutes } from './router';

function flattenRoutes(routes: RouteObject[]): RouteObject[] {
  return routes.flatMap(route => [route, ...flattenRoutes(route.children ?? [])]);
}

describe('application data router', () => {
  it('matches every non-container, non-legacy route to the canonical catalog exactly', () => {
    const routes = flattenRoutes(appRoutes);
    const infrastructureIds = new Set(['application', 'authenticated', 'basic-layout']);
    const actualRoutes = routes
      .filter(route => route.path && !infrastructureIds.has(route.id ?? '') && !route.id?.startsWith('legacy-'))
      .map(route => ({ id: route.id, path: route.path }))
      .sort(compareRouteId);
    const canonicalRoutes = routeRegistry.map(route => ({ id: route.id, path: route.path })).sort(compareRouteId);

    expect(actualRoutes).toEqual(canonicalRoutes);
    expect(appRoutes[0]).toMatchObject({ id: 'application', path: applicationRootPath });
  });

  it('keeps legacy redirects explicit and separate from canonical pages', () => {
    const legacyRoutes = flattenRoutes(appRoutes)
      .filter(route => route.id?.startsWith('legacy-'))
      .map(route => route.path)
      .sort();

    expect(legacyRoutes).toEqual(Object.values(legacySettingsPaths).sort());
  });

  it('enforces canonical page, redirect, and layout ownership in the route tree', () => {
    const applicationChildren = appRoutes[0]?.children ?? [];
    const authenticatedRoute = applicationChildren.find(route => route.id === 'authenticated');
    const basicRoute = authenticatedRoute?.children?.find(route => route.id === 'basic-layout');
    const directCanonicalRoutes = applicationChildren.filter(route => route.id && route.id !== 'authenticated');
    const basicCanonicalRoutes = (basicRoute?.children ?? []).filter(
      route => route.id && !route.id.startsWith('legacy-')
    );

    expect(
      directCanonicalRoutes
        .map(route => ({ id: route.id, layout: getAppRoute(route.id as AppRouteId).layout }))
        .sort(compareRouteId)
    ).toEqual([
      { id: 'login', layout: 'passport' },
      { id: 'status', layout: 'blank' }
    ]);
    expect(isValidElement(authenticatedRoute?.element)).toBe(true);
    if (!isValidElement(authenticatedRoute?.element)) throw new Error('The authenticated route gate is missing.');
    expect(authenticatedRoute.element.type).toBe(AuthGate);
    expect(basicCanonicalRoutes.map(route => route.id).sort()).toEqual(
      routeRegistry
        .filter(route => route.layout === 'basic')
        .map(route => route.id)
        .sort()
    );

    [...directCanonicalRoutes, ...basicCanonicalRoutes].forEach(route => {
      const definition = getAppRoute(route.id as AppRouteId);
      expect(Boolean(route.lazy)).toBe(definition.kind === 'page');
      if (definition.kind === 'redirect') expect(route.element).toBeDefined();
    });

    expect(applicationChildren.find(route => route.index)?.element).toBeDefined();
  });

  it('provides a shared route error boundary', () => {
    expect(appRoutes).toHaveLength(1);
    expect(appRoutes[0]?.errorElement).toBeDefined();
  });

  it('delegates the Token route to its feature-owned lazy loader', () => {
    const tokenRoute = flattenRoutes(appRoutes).find(route => route.id === 'tokens');

    expect(tokenRoute?.lazy).toBe(loadTokenPageRoute);
  });
});

function compareRouteId(left: { id: string | undefined }, right: { id: string | undefined }) {
  return (left.id ?? '').localeCompare(right.id ?? '');
}
