/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
