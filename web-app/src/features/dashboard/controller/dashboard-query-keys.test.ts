/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import controllerSource from './use-dashboard-controller.ts?raw';
import { dashboardQueryKeys } from './dashboard-query-keys';

describe('Dashboard Query Keys', () => {
  it('preserves the established identity of the combined dashboard read', () => {
    expect(dashboardQueryKeys.summary()).toEqual(['dashboard']);
  });

  it('keeps the controller on the feature-owned Query Key factory', () => {
    expect(controllerSource).toContain("from './dashboard-query-keys'");
    expect(controllerSource).toContain('queryKey: dashboardQueryKeys.summary()');
    expect(controllerSource).not.toMatch(/queryKey:\s*\[/);
  });
});
