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
import { AdministrativeRouteAccess } from './administrative-route-access';
import { applicationRootPath, getAppRoute, legacyRouteCatalog, routeRegistry, type AppRouteId } from './route-registry';
import { appRoutes } from './app-routes';

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

    expect(legacyRoutes).toEqual(legacyRouteCatalog.map(route => route.path).sort());
  });

  it('places legacy redirects in the same authenticated layout boundary as their canonical targets', () => {
    const authenticatedRoute = appRoutes[0]?.children?.find(route => route.id === 'authenticated');
    const basicRoute = authenticatedRoute?.children?.find(route => route.id === 'basic-layout');
    const directLegacyIds = (authenticatedRoute?.children ?? [])
      .filter(route => route.id?.startsWith('legacy-'))
      .map(route => route.id)
      .sort();
    const basicLegacyIds = (basicRoute?.children ?? [])
      .filter(route => route.id?.startsWith('legacy-'))
      .map(route => route.id)
      .sort();

    expect(directLegacyIds).toEqual(legacyIdsForLayout('blank'));
    expect(basicLegacyIds).toEqual(legacyIdsForLayout('basic'));
  });

  it('leaves excluded legacy product areas on the wildcard 404 route', () => {
    const legacyPaths = new Set(legacyRouteCatalog.map(route => route.path));

    for (const path of ['/actions', '/incidents', '/events', '/ai', '/mcp', '/ui-lab']) {
      expect(legacyPaths.has(path)).toBe(false);
      expect(flattenRoutes(appRoutes).some(route => route.path === path)).toBe(false);
    }
  });

  it('keeps public canonical pages on their declared layouts', () => {
    const applicationChildren = appRoutes[0]?.children ?? [];
    const directCanonicalRoutes = applicationChildren.filter(route => route.id && route.id !== 'authenticated');
    expect(
      directCanonicalRoutes
        .map(route => ({ id: route.id, layout: getAppRoute(route.id as AppRouteId).layout }))
        .sort(compareRouteId)
    ).toEqual([
      { id: 'lock', layout: 'passport' },
      { id: 'login', layout: 'passport' },
      { id: 'status', layout: 'blank' }
    ]);
    expect(applicationChildren.find(route => route.index)?.element).toBeDefined();
  });

  it('protects the immersive instrumentation route without the basic shell', () => {
    const authenticatedRoute = appRoutes[0]?.children?.find(route => route.id === 'authenticated');
    const basicRoute = authenticatedRoute?.children?.find(route => route.id === 'basic-layout');
    const authenticatedCanonicalRoutes = (authenticatedRoute?.children ?? []).filter(
      route => route.id && route.id !== 'basic-layout' && !route.id.startsWith('legacy-')
    );
    expect(isValidElement(authenticatedRoute?.element)).toBe(true);
    if (!isValidElement(authenticatedRoute?.element)) throw new Error('The authenticated route gate is missing.');
    expect(authenticatedRoute.element.type).toBe(AuthGate);
    expect(authenticatedCanonicalRoutes.map(route => route.id)).toEqual(['instrumentation']);
    expect(authenticatedCanonicalRoutes[0]).toMatchObject({
      id: getAppRoute('instrumentation').id,
      path: getAppRoute('instrumentation').path
    });
    expect((basicRoute?.children ?? []).some(route => route.id === 'instrumentation')).toBe(false);
  });

  it('keeps basic canonical routes and redirect ownership inside the shell', () => {
    const authenticatedRoute = appRoutes[0]?.children?.find(route => route.id === 'authenticated');
    const basicRoute = authenticatedRoute?.children?.find(route => route.id === 'basic-layout');
    const basicCanonicalRoutes = (basicRoute?.children ?? []).filter(
      route => route.id && !route.id.startsWith('legacy-')
    );
    expect(basicCanonicalRoutes.map(route => route.id).sort()).toEqual(
      routeRegistry
        .filter(route => route.layout === 'basic')
        .map(route => route.id)
        .sort()
    );

    for (const route of basicCanonicalRoutes) {
      const definition = getAppRoute(route.id as AppRouteId);
      const hasPageLoader = Boolean(route.lazy) || isAdministrativeRoute(route);
      expect(hasPageLoader).toBe(definition.kind === 'page');
      if (definition.kind === 'redirect') expect(route.element).toBeDefined();
    }
  });

  it('provides a shared route error boundary', () => {
    expect(appRoutes).toHaveLength(1);
    expect(appRoutes[0]?.errorElement).toBeDefined();
  });

  it.each(['tokens', 'plugins'])('places the %s page behind the administrative boundary', routeId => {
    const route = flattenRoutes(appRoutes).find(candidate => candidate.id === routeId);
    expect(isValidElement(route?.element)).toBe(true);
    if (!isValidElement(route?.element)) throw new Error(`The ${routeId} access boundary is missing.`);
    expect(route.element.type).toBe(AdministrativeRouteAccess);
  });
});

function isAdministrativeRoute(route: RouteObject) {
  return isValidElement(route.element) && route.element.type === AdministrativeRouteAccess;
}

function compareRouteId(left: { id: string | undefined }, right: { id: string | undefined }) {
  return (left.id ?? '').localeCompare(right.id ?? '');
}

function legacyIdsForLayout(layout: 'basic' | 'blank') {
  return legacyRouteCatalog
    .filter(definition => getAppRoute(definition.targetRouteId).layout === layout)
    .map(definition => definition.id)
    .sort();
}
