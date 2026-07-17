/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { routeRegistry } from '@/app/route-registry';

import { refineResources } from './refine-resource-registry';

describe('Refine shell resource registry', () => {
  it('covers every canonical visible route without inventing a second route path', () => {
    const canonicalPaths = new Set<string>(routeRegistry.map(route => route.path));
    const resourcePaths = refineResources.flatMap(resource => resource.list ? [resource.list] : []);

    resourcePaths.forEach(path => expect(canonicalPaths.has(path)).toBe(true));
    routeRegistry.filter(route => route.navigation).forEach(route => {
      expect(resourcePaths).toContain(route.path);
    });
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
});
