/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { resolveTopologyExternalIcon, resolveTopologyNodeIcon } from './topology-node-icon';

describe('topology node icon resolver', () => {
  it.each([
    ['application', 'application', 'app-window'],
    ['app', 'application', 'app-window'],
    ['service', 'service', 'server-cog'],
    ['api', 'service', 'server-cog'],
    ['endpoint', 'endpoint', 'route'],
    ['/checkout', 'endpoint', 'route'],
    ['database', 'database', 'database'],
    ['db', 'database', 'database'],
    ['mysql', 'database', 'database'],
    ['postgres', 'database', 'database'],
    ['mongo', 'database', 'database'],
    ['redis', 'cache', 'memory-stick'],
    ['queue', 'queue', 'inbox'],
    ['mq', 'queue', 'inbox'],
    ['broker', 'queue', 'inbox'],
    ['topic', 'queue', 'inbox'],
    ['kafka', 'queue', 'inbox'],
    ['rabbit', 'queue', 'inbox'],
    ['middleware', 'middleware', 'workflow'],
    ['deployment', 'k8s-workload', 'container'],
    ['collector', 'monitor', 'activity'],
    ['host', 'resource', 'server'],
    ['event', 'alert', 'triangle-alert']
  ] as const)('maps %s to the maintained %s Lucide icon', (entityType, iconKind, iconName) => {
    expect(resolveTopologyNodeIcon(entityType, '#102030')).toMatchObject({
      iconKind,
      iconName,
      iconLibrary: 'lucide-react',
      iconSource: 'entity-type-catalog'
    });
  });

  it('uses explicit unknown and external fallbacks', () => {
    expect(resolveTopologyNodeIcon('vendor-private-kind', '#102030')).toMatchObject({
      iconKind: 'unknown',
      iconName: 'circle-help',
      iconSource: 'entity-type-catalog'
    });
    expect(resolveTopologyExternalIcon('#102030')).toMatchObject({
      iconKind: 'unknown',
      iconName: 'circle-help',
      iconLibrary: 'lucide-react',
      iconSource: 'external-fallback'
    });
  });

  it('encodes the active theme text color into the Lucide SVG source', () => {
    const light = resolveTopologyNodeIcon('service', '#102030').iconSrc;
    const dark = resolveTopologyNodeIcon('service', '#e8edf5').iconSrc;

    expect(light).not.toBe(dark);
    expect(decodeURIComponent(light)).toContain('stroke="#102030"');
    expect(decodeURIComponent(dark)).toContain('stroke="#e8edf5"');
  });
});
