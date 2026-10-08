/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Perses runtime registry', () => {
  afterEach(() => {
    vi.doUnmock('./perses-signal-runtime');
    vi.resetModules();
  });

  it('lazily loads one production runtime shared by every signal', async () => {
    let multiSignalLoads = 0;
    vi.doMock('./perses-signal-runtime', () => {
      multiSignalLoads += 1;
      return { PersesSignalRuntime: () => null };
    });

    const { loadPersesRuntime } = await import('./perses-runtime-registry');

    expect(multiSignalLoads).toBe(0);

    await loadPersesRuntime();
    expect(multiSignalLoads).toBe(1);
    await loadPersesRuntime();
    expect(multiSignalLoads).toBe(1);
  });
});
