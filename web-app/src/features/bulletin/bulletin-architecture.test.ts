/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';
import apiSource from './api/bulletin-api.ts?raw';
import controllerSource from './controller/bulletin-controller.ts?raw';

describe('bulletin architecture', () => {
  it('uses the monitor public contract instead of feature internals', () => {
    expect(controllerSource).toContain("from '@/features/monitor'");
    expect(controllerSource).not.toMatch(/@\/features\/monitor\/(api|controller|model|pages|components)/);
  });

  it('uses runtime schemas instead of a local primitive parser family', () => {
    expect(apiSource).toContain("from './bulletin-schema'");
    expect(apiSource).not.toMatch(/function\s+(?:array|boolean|integer|number|object|record|stringArray|text)\s*\(/);
  });
});
