/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';
import { isValidElement } from 'react';

import { routeRegistry } from '@/app/route-registry';
import { uiSessionSchema } from '@/core/auth/session-contract';
import { buildShellNavigation, readShellResourceMeta } from '@/layout/shell/shell-navigation-model';
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

  it('declares shell policy metadata for every registered resource', () => {
    refineResources.forEach(resource => {
      expect(resource.meta?.shell).toMatchObject({
        capability: expect.stringMatching(/^(supported|unknown|unsupported)$/),
        navigation: expect.any(Boolean),
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

  it('keeps the two-level product navigation while assigning each feature to its operating domain', () => {
    const tree = buildShellNavigation(refineResources, ['ADMIN']);

    expect(tree.map(item => item.name)).toEqual([
      'dashboard',
      'ai-workspace',
      'shell-basic-monitoring',
      'shell-application-observability',
      'shell-resources',
      'shell-alerting',
      'shell-administration'
    ]);
    expect(navigationChildren(tree, 'shell-basic-monitoring')).toEqual(['monitors', 'bulletin', 'monitor-definitions']);
    expect(navigationChildren(tree, 'shell-application-observability')).toEqual(['explore', 'instrumentation']);
    expect(navigationChildren(tree, 'shell-resources')).toEqual(['entities', 'topology']);
    expect(navigationChildren(tree, 'shell-alerting')).toEqual([
      'alerts',
      'alert-rules',
      'alert-groups',
      'alert-inhibits',
      'alert-silences',
      'alert-integrations',
      'notice-receivers',
      'notice-rules',
      'notice-templates',
      'message-server'
    ]);
    expect(navigationChildren(tree, 'shell-administration')).toEqual([
      'system-config',
      'deployment-settings',
      'plugins',
      'collectors',
      'tokens',
      'labels',
      'object-store',
      'status-management'
    ]);
  });

  it('assigns every visible navigation item a globally unique Ant Design icon component', () => {
    const items = flattenNavigation(buildShellNavigation(refineResources, ['ADMIN']));
    const iconTypes = items.map(item => {
      expect(isValidElement(item.icon)).toBe(true);
      if (!isValidElement(item.icon)) throw new Error(`Missing icon for ${item.name}`);
      return item.icon.type;
    });

    expect(new Set(iconTypes).size).toBe(iconTypes.length);
  });

  it('keeps implementation-only parents and monitor filters out of the global sidebar', () => {
    const names = flattenNavigationNames(buildShellNavigation(refineResources, ['ADMIN']));

    expect(names).not.toContain('settings');
    expect(names.some(name => name.startsWith('monitor-category:'))).toBe(false);
    expect(names.some(name => name.startsWith('monitor-app:'))).toBe(false);
  });

  it('registers monitor application filters without growing global navigation', () => {
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
      list: undefined,
      navigation: false
    });
    expect(resourceIdentity(resources, 'monitor-app:mysql')).toEqual({
      label: 'MySQL',
      labelKey: 'monitor.apps.mysql',
      parent: 'monitor-category:db',
      list: '/monitors?app=mysql',
      navigation: false
    });
    expect(resourceIdentity(resources, 'monitor-app:postgresql')).toEqual({
      label: 'PostgreSQL',
      labelKey: 'monitor.apps.postgresql',
      parent: 'monitor-category:db',
      list: '/monitors?app=postgresql',
      navigation: false
    });
    expect(resourceIdentity(resources, 'monitor-app:website')).toEqual({
      label: 'Website',
      labelKey: 'monitor.apps.website',
      parent: 'monitors',
      list: '/monitors?app=website',
      navigation: false
    });
    expect(resourceIdentity(resources, 'monitor-category:extension')).toMatchObject({
      label: 'extension',
      labelKey: 'monitor.categories.extension'
    });
    expect(resources.filter(resource => resource.name === 'monitor-app:mysql')).toHaveLength(1);
    expect(resources.find(resource => resource.name === 'monitor-app:private')).toBeUndefined();
    expect(resources.find(resource => resource.name === 'monitor-app:internal')).toBeUndefined();
    expect(flattenNavigationNames(buildShellNavigation(resources, ['ADMIN']))).not.toEqual(
      expect.arrayContaining([
        'monitor-category:db',
        'monitor-app:mysql',
        'monitor-app:postgresql',
        'monitor-app:website'
      ])
    );
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

  it('propagates real route roles and applies them consistently', async () => {
    const instrumentation = refineResources.find(candidate => candidate.name === 'instrumentation');
    expect(readShellResourceMeta(instrumentation?.meta?.shell)).toMatchObject({ requiredRoles: ['ADMIN', 'USER'] });
    await expect(canAccess(instrumentation, ['ADMIN'])).resolves.toEqual({ can: true });
    await expect(canAccess(instrumentation, ['USER'])).resolves.toEqual({ can: true });
    await expect(canAccess(instrumentation, ['GUEST'])).resolves.toEqual({ can: false, reason: 'ROLE_REQUIRED' });

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
  if (!resource?.meta?.shell) throw new Error(`Missing shell resource: ${name}`);
  return {
    label: resource.meta.shell.label,
    labelKey: resource.meta.shell.labelKey,
    navigation: resource.meta.shell.navigation,
    parent: resource.meta.parent,
    list: resource.list
  };
}

function navigationChildren(tree: ReturnType<typeof buildShellNavigation>, name: string) {
  return tree.find(item => item.name === name)?.children.map(item => item.name);
}

function flattenNavigationNames(tree: ReturnType<typeof buildShellNavigation>): string[] {
  return tree.flatMap(item => [item.name, ...flattenNavigationNames(item.children)]);
}

function flattenNavigation(tree: ReturnType<typeof buildShellNavigation>): ReturnType<typeof buildShellNavigation> {
  return tree.flatMap(item => [item, ...flattenNavigation(item.children)]);
}

function canAccess(resource: (typeof refineResources)[number] | undefined, roles: string[]) {
  if (!resource) throw new Error('Expected Refine resource.');
  return shellAccessControlProvider.can({
    resource: resource.name,
    action: 'list',
    params: { resource, roles }
  });
}
