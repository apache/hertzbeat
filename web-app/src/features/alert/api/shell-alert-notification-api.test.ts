/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const transport = vi.hoisted(() => ({
  apiMessageGet: vi.fn(),
  apiMessagePost: vi.fn()
}));

vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  ...transport
}));

import { AlertContractError, AlertRequestFailure } from '../model/alert-model';
import { loadShellAlertMute, saveShellAlertMute } from './shell-alert-notification-api';

describe('shell alert notification API', () => {
  beforeEach(() => vi.resetAllMocks());

  it('loads and validates the existing server-backed mute config', async () => {
    const signal = new AbortController().signal;
    transport.apiMessageGet.mockResolvedValue({ mute: false, ignored: 'server-only' });

    await expect(loadShellAlertMute(signal)).resolves.toEqual({ muted: false });
    expect(transport.apiMessageGet).toHaveBeenCalledWith('/api/config/mute', { signal });

    transport.apiMessageGet.mockResolvedValueOnce({});
    await expect(loadShellAlertMute()).rejects.toBeInstanceOf(AlertContractError);
  });

  it('saves only the mute flag', async () => {
    transport.apiMessagePost.mockResolvedValue(undefined);

    await expect(saveShellAlertMute(true)).resolves.toEqual({ muted: true });
    expect(transport.apiMessagePost).toHaveBeenCalledWith('/api/config/mute', { mute: true });
  });

  it('maps API transport evidence to the alert domain failure boundary', async () => {
    const { ApiMessageError } =
      await vi.importActual<typeof import('@/core/http/api-message')>('@/core/http/api-message');
    transport.apiMessageGet.mockRejectedValue(new ApiMessageError('private', { status: 503 }));

    await expect(loadShellAlertMute()).rejects.toBeInstanceOf(AlertRequestFailure);
    await expect(loadShellAlertMute()).rejects.toMatchObject({ kind: 'unavailable' });
  });
});
