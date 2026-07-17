/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';
import controllerSource from './controller/bulletin-controller.ts?raw';

describe('bulletin architecture', () => {
  it('uses the monitor public contract instead of feature internals', () => {
    expect(controllerSource).toContain("from '@/features/monitor'");
    expect(controllerSource).not.toMatch(/@\/features\/monitor\/(api|controller|model|pages|components)/);
  });
});
