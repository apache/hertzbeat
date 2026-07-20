/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { activeNavigationTrail, buildShellNavigation, resolveShellTimePolicy } from './shell-navigation-model';

describe('shell navigation model', () => {
  const resources = [
    resource('workspace', undefined, undefined, 10),
    resource('monitors', '/monitors', 'workspace', 10),
    resource('alerts', '/alerts', 'workspace', 20),
    resource('alert-rules', '/alerts/rules', 'alerts', 10),
    resource('unknown-capability', '/unknown', 'workspace', 30, 'unknown')
  ];

  it('builds ordered parent and child navigation from Refine resource metadata', () => {
    const tree = buildShellNavigation(resources);

    expect(tree.map(item => item.name)).toEqual(['workspace']);
    expect(tree[0]?.children.map(item => item.name)).toEqual(['monitors', 'alerts', 'unknown-capability']);
    expect(tree[0]?.children[1]?.children.map(item => item.name)).toEqual(['alert-rules']);
  });

  it('uses the longest registered route for deep-link selection', () => {
    const tree = buildShellNavigation(resources);

    expect(activeNavigationTrail(tree, '/alerts/rules/42/edit')).toEqual(['workspace', 'alerts', 'alert-rules']);
  });

  it('keeps unknown capability entries visible but explicitly disabled', () => {
    const tree = buildShellNavigation(resources);
    const unknown = tree[0]?.children.find(item => item.name === 'unknown-capability');

    expect(unknown).toMatchObject({ capability: 'unknown', disabled: true });
  });

  it('uses typed action overrides and falls back to the resource policy for every other action', () => {
    const shell = {
      capability: 'supported' as const,
      labelKey: 'menu.monitors',
      navigation: true,
      order: 20,
      timePolicy: 'none' as const,
      actionTimePolicies: { show: 'global' as const }
    };

    expect(resolveShellTimePolicy(shell, 'show')).toBe('global');
    expect(resolveShellTimePolicy(shell, 'list')).toBe('none');
    expect(resolveShellTimePolicy(shell, 'create')).toBe('none');
    expect(resolveShellTimePolicy(shell, 'edit')).toBe('none');
    expect(resolveShellTimePolicy(shell, undefined)).toBe('none');
    expect(resolveShellTimePolicy(undefined, undefined)).toBe('unknown');
  });
});

function resource(
  name: string,
  list?: string,
  parent?: string,
  order = 0,
  capability: 'supported' | 'unknown' | 'unsupported' = 'supported'
) {
  return {
    name,
    meta: {
      shell: {
        capability,
        labelKey: `shell.navigation.${name}`,
        navigation: true,
        order,
        timePolicy: list ? ('unknown' as const) : ('none' as const)
      },
      ...(parent ? { parent } : {})
    },
    ...(list ? { list } : {})
  };
}
