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
import { refineResources, shellAccessControlProvider } from './refine-resource-registry';

describe('Refine shell resource registry', () => {
  it('matches canonical resource paths and labels exactly', () => {
    const canonicalResources = routeRegistry
      .flatMap(route => (route.resource ? [{ labelKey: route.resource.labelKey, list: route.path }] : []))
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
});

function shellMeta(name: string) {
  return readShellResourceMeta(refineResources.find(resource => resource.name === name)?.meta?.shell);
}

function compareResourceRoute(left: { list: string }, right: { list: string }) {
  return left.list.localeCompare(right.list);
}
