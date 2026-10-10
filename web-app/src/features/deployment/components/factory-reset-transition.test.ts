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

import { describe, expect, it, vi } from 'vitest';

import { waitForFactoryResetSetup } from './factory-reset-transition';

describe('waitForFactoryResetSetup', () => {
  it('waits through the old completed runtime and a restart gap', async () => {
    const loadStatus = vi
      .fn()
      .mockResolvedValueOnce({ phase: 'complete' })
      .mockRejectedValueOnce(new Error('context restarting'))
      .mockResolvedValueOnce({ phase: 'configuration_required' });
    const pause = vi.fn().mockResolvedValue(undefined);

    await expect(waitForFactoryResetSetup(loadStatus, pause, 3)).resolves.toBeUndefined();

    expect(loadStatus).toHaveBeenCalledTimes(3);
    expect(pause).toHaveBeenCalledTimes(2);
  });

  it('fails honestly when the runtime never leaves the completed phase', async () => {
    const loadStatus = vi.fn().mockResolvedValue({ phase: 'complete' });
    const pause = vi.fn().mockResolvedValue(undefined);

    await expect(waitForFactoryResetSetup(loadStatus, pause, 2)).rejects.toThrow(
      'Factory reset setup transition timed out'
    );
  });
});
