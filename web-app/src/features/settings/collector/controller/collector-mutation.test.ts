/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import {
  classifyCollectorMutationFailure,
  collectorMutationConverged,
  executeCollectorMutation
} from './collector-mutation';

const online = { name: 'edge', online: true };
const offline = { name: 'edge', online: false };

describe('Collector mutation proof', () => {
  it('requires an authoritative projection that proves the requested state', () => {
    expect(collectorMutationConverged({ action: 'online', collectors: ['edge'] }, [online])).toBe(true);
    expect(collectorMutationConverged({ action: 'offline', collectors: ['edge'] }, [offline])).toBe(true);
    expect(collectorMutationConverged({ action: 'delete', collectors: ['edge'] }, [])).toBe(true);
    expect(collectorMutationConverged({ action: 'online', collectors: ['edge'] }, [offline])).toBe(false);
    expect(collectorMutationConverged({ action: 'delete', collectors: ['edge'] }, [offline])).toBe(false);
  });

  it('classifies permission, validation, unavailable, and redacted generic failures', () => {
    expect(classifyCollectorMutationFailure(new ApiMessageError('forbidden raw detail', { status: 403 }))).toBe(
      'permission'
    );
    expect(classifyCollectorMutationFailure(new ApiMessageError('bad raw detail', { status: 422 }))).toBe('validation');
    expect(
      classifyCollectorMutationFailure(new ApiMessageError('business raw detail', { status: 200, code: 20 }))
    ).toBe('validation');
    expect(classifyCollectorMutationFailure(new ApiMessageError('server raw detail', { status: 503 }))).toBe(
      'unavailable'
    );
    expect(classifyCollectorMutationFailure(new Error('raw detail'))).toBe('error');
  });

  it('accepts a write only after a successful authoritative reread converges', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const reread = vi.fn().mockResolvedValue([online]);

    await expect(executeCollectorMutation({ action: 'online', collectors: ['edge'] }, write, reread)).resolves.toEqual({
      kind: 'confirmed',
      projection: [online]
    });
    expect(write).toHaveBeenCalledTimes(1);
    expect(reread).toHaveBeenCalledTimes(1);
  });

  it('does not repeat a rejected write and preserves classified permission feedback', async () => {
    const write = vi.fn().mockRejectedValue(new ApiMessageError('raw forbidden detail', { status: 403 }));
    const reread = vi.fn();

    await expect(executeCollectorMutation({ action: 'offline', collectors: ['edge'] }, write, reread)).resolves.toEqual(
      { kind: 'failed', failure: 'permission' }
    );
    expect(write).toHaveBeenCalledTimes(1);
    expect(reread).not.toHaveBeenCalled();
  });

  it('rereads after an ambiguous transport failure but never invents confirmed success', async () => {
    const write = vi.fn().mockRejectedValue(new ApiMessageError('raw transport detail', { cause: new Error() }));
    const reread = vi.fn().mockResolvedValue([online]);

    await expect(executeCollectorMutation({ action: 'online', collectors: ['edge'] }, write, reread)).resolves.toEqual({
      kind: 'failed',
      failure: 'unavailable',
      projection: [online]
    });
    expect(write).toHaveBeenCalledTimes(1);
    expect(reread).toHaveBeenCalledTimes(1);
  });

  it('treats a nonzero success-envelope code as validation feedback with GET-only proof', async () => {
    const write = vi.fn().mockRejectedValue(new ApiMessageError('raw business detail', { status: 200, code: 20 }));
    const reread = vi.fn().mockResolvedValue([offline]);

    await expect(executeCollectorMutation({ action: 'online', collectors: ['edge'] }, write, reread)).resolves.toEqual({
      kind: 'failed',
      failure: 'validation',
      projection: [offline]
    });
    expect(write).toHaveBeenCalledTimes(1);
    expect(reread).toHaveBeenCalledTimes(1);
  });
});
