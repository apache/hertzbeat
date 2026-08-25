/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
