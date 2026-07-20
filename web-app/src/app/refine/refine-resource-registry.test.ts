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
});

function compareResourceRoute(left: { list: string }, right: { list: string }) {
  return left.list.localeCompare(right.list);
}
