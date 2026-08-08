/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadSetupStatus, SetupRequestError } from './setup-api';

describe('setup API transport failure', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('preserves an Error-backed DOM AbortError instead of turning it into unavailable evidence', async () => {
    const cancellation = new Error('Caller cancelled');
    cancellation.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(cancellation));

    await expect(loadSetupStatus()).rejects.toBe(cancellation);
  });

  it('classifies a real apiFetch rejection as unavailable without exposing its message', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new Error('private network detail')));

    const failure = await captureFailure(loadSetupStatus());
    expect(failure instanceof SetupRequestError).toBe(true);
    if (!(failure instanceof SetupRequestError)) throw new Error('Expected a typed setup failure');
    expect(failure.kind).toBe('unavailable');
    expect(failure.message).toBe('Setup request failed');
  });
});

async function captureFailure(request: Promise<unknown>) {
  try {
    await request;
  } catch (error) {
    return error;
  }
  throw new Error('Expected setup request to fail');
}
