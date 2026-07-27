/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { routeRegistry } from '@/app/route-registry';
import { uiSessionSchema } from '@/core/auth/session-contract';
import { readShellResourceMeta } from '@/layout/shell/shell-navigation-model';
import { buildRefineResources, refineResources, shellAccessControlProvider } from './refine-resource-registry';

describe('Refine shell resource registry', () => {
  it('matches canonical resource paths and labels exactly', () => {
    const canonicalResources = routeRegistry
      .flatMap(route =>
        route.resource ? [{ labelKey: route.resource.labelKey, list: route.resource.listPath ?? route.path }] : []
      )
      .sort(compareResourceRoute);
    const actualResources = refineResources
      .filter(resource => resource.list)
      .map(resource => ({ labelKey: resource.meta?.shell?.labelKey, list: resource.list as string }))
      .sort(compareResourceRoute);

    expect(actualResources).toEqual(canonicalResources);
  });

  it('declares a time policy and capability for every visible resource', () => {
    refineResources.forEach(resource => {
      expect(resource.meta?.shell).toMatchObject({
        capability: expect.stringMatching(/^(supported|unknown|unsupported)$/),
        navigation: true,
        timePolicy: expect.stringMatching(/^(global|route_owned|none|unknown)$/)
      });
    });
  });

  it('assigns global time only to routes whose active queries consume the shared window and revision', () => {
    expect(shellMeta('dashboard')).toMatchObject({ timePolicy: 'none' });
    expect(shellMeta('topology')).toMatchObject({ timePolicy: 'global' });
    expect(shellMeta('explore')).toMatchObject({ timePolicy: 'route_owned' });
    expect(shellMeta('instrumentation')).toMatchObject({ timePolicy: 'none' });
    expect(shellMeta('alerts')).toMatchObject({ timePolicy: 'none' });
    expect(shellMeta('bulletin')).toMatchObject({ timePolicy: 'none' });
    expect(shellMeta('monitors')).toMatchObject({
      timePolicy: 'none'
    });
    expect(shellMeta('monitors')?.actionTimePolicies).toBeUndefined();
    expect(refineResources.find(resource => resource.name === 'monitors')).toMatchObject({
      create: '/monitors/new',
      edit: '/monitors/:monitorId/edit',
      list: '/monitors',
      show: '/monitors/:monitorId'
    });
    expect(refineResources.find(resource => resource.name === 'alert-integrations')).toMatchObject({
      list: '/alerts/integrations/webhook'
    });
  });

  it('places topology between Entities and Explore in the workspace navigation', () => {
    const workspace = refineResources
      .filter(resource => resource.meta?.parent === 'shell-workspace')
      .sort((left, right) => Number(left.meta?.shell?.order) - Number(right.meta?.shell?.order))
      .map(resource => resource.name);

    expect(workspace).toEqual(expect.arrayContaining(['entities', 'topology', 'explore']));
    expect(workspace.indexOf('entities')).toBeLessThan(workspace.indexOf('topology'));
    expect(workspace.indexOf('topology')).toBeLessThan(workspace.indexOf('explore'));
  });

  it('restores visible backend monitor applications as stable nested navigation resources', () => {
    const resources = buildRefineResources([
      { category: 'db', value: 'postgresql', label: 'PostgreSQL', hide: false },
      { category: 'db', value: 'mysql', label: 'MySQL', hide: false },
      { category: 'db', value: 'mysql', label: 'Duplicate MySQL', hide: false },
      { category: 'custom', value: 'private', label: 'Private', hide: true },
      { category: null, value: 'website', label: 'Website', hide: false },
      { category: 'extension', value: 'vendor', label: 'Vendor', hide: false },
      { category: '__system__', value: 'internal', label: 'Internal', hide: false }
    ]);

    expect(resourceIdentity(resources, 'monitor-category:db')).toEqual({
      label: undefined,
      labelKey: 'monitor.categories.db',
      parent: 'monitors',
      list: undefined
    });
    expect(resourceIdentity(resources, 'monitor-app:mysql')).toEqual({
      label: 'MySQL',
      labelKey: 'monitor.apps.mysql',
      parent: 'monitor-category:db',
      list: '/monitors?app=mysql'
    });
    expect(resourceIdentity(resources, 'monitor-app:postgresql')).toEqual({
      label: 'PostgreSQL',
      labelKey: 'monitor.apps.postgresql',
      parent: 'monitor-category:db',
      list: '/monitors?app=postgresql'
    });
    expect(resourceIdentity(resources, 'monitor-app:website')).toEqual({
      label: 'Website',
      labelKey: 'monitor.apps.website',
      parent: 'monitors',
      list: '/monitors?app=website'
    });
    expect(resourceIdentity(resources, 'monitor-category:extension')).toMatchObject({
      label: 'extension',
      labelKey: 'monitor.categories.extension'
    });
    expect(resources.filter(resource => resource.name === 'monitor-app:mysql')).toHaveLength(1);
    expect(resources.find(resource => resource.name === 'monitor-app:private')).toBeUndefined();
    expect(resources.find(resource => resource.name === 'monitor-app:internal')).toBeUndefined();
  });

  it('admits a normalized lowercase session role to an ADMIN resource', async () => {
    const session = uiSessionSchema.parse({
      authenticated: true,
      username: 'operator',
      roles: [' admin '],
      workspaceId: 'default',
      expiresAt: null
    });

    await expect(
      shellAccessControlProvider.can({
        resource: 'admin-proof',
        action: 'list',
        params: {
          roles: session.roles,
          resource: {
            name: 'admin-proof',
            meta: {
              shell: {
                capability: 'supported',
                labelKey: 'settingsNavigation.monitorDefinitions',
                navigation: true,
                order: 1,
                requiredRoles: ['ADMIN'],
                timePolicy: 'none'
              }
            }
          }
        }
      })
    ).resolves.toEqual({ can: true });
  });

  it('propagates real Token and Plugin route roles and denies non-administrative sessions', async () => {
    for (const name of ['tokens', 'plugins']) {
      const resource = refineResources.find(candidate => candidate.name === name);
      expect(readShellResourceMeta(resource?.meta?.shell)).toMatchObject({ requiredRoles: ['ADMIN'] });
      await expect(canAccess(resource, ['ADMIN'])).resolves.toEqual({ can: true });
      await expect(canAccess(resource, ['USER'])).resolves.toEqual({ can: false, reason: 'ROLE_REQUIRED' });
      await expect(canAccess(resource, ['GUEST'])).resolves.toEqual({ can: false, reason: 'ROLE_REQUIRED' });
    }
  });
});

function shellMeta(name: string) {
  return readShellResourceMeta(refineResources.find(resource => resource.name === name)?.meta?.shell);
}

function compareResourceRoute(left: { list: string }, right: { list: string }) {
  return left.list.localeCompare(right.list);
}

function resourceIdentity(resources: ReturnType<typeof buildRefineResources>, name: string) {
  const resource = resources.find(candidate => candidate.name === name);
  return {
    label: resource?.meta?.shell?.label,
    labelKey: resource?.meta?.shell?.labelKey,
    parent: resource?.meta?.parent,
    list: resource?.list
  };
}

function canAccess(resource: (typeof refineResources)[number] | undefined, roles: string[]) {
  if (!resource) throw new Error('Expected Refine resource.');
  return shellAccessControlProvider.can({
    resource: resource.name,
    action: 'list',
    params: { resource, roles }
  });
}
