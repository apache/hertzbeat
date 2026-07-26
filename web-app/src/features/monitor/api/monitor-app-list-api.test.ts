/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ apiMessageGet: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  ...http
}));

import { MonitorContractError } from '../model/monitor-contract';
import { loadMonitorsByApp } from './monitor-app-list-api';

const monitor = {
  id: 7,
  name: 'checkout',
  app: 'springboot3',
  instance: 'checkout-a',
  status: 1,
  labels: { team: 'platform' },
  ignored: 'wire-only'
};

describe('monitor application list API', () => {
  beforeEach(() => http.apiMessageGet.mockReset());

  it('encodes the application, forwards cancellation, and strips unknown fields', async () => {
    const signal = new AbortController().signal;
    http.apiMessageGet.mockResolvedValue([monitor]);

    await expect(loadMonitorsByApp('springboot3', signal)).resolves.toEqual([
      {
        id: 7,
        name: 'checkout',
        app: 'springboot3',
        instance: 'checkout-a',
        status: 1,
        labels: { team: 'platform' }
      }
    ]);
    expect(http.apiMessageGet).toHaveBeenCalledWith('/api/monitors/springboot3', { signal });
  });

  it.each([
    null,
    {},
    [{ ...monitor, id: 1.5 }],
    [{ ...monitor, name: '' }],
    [{ ...monitor, app: 'linux' }],
    [monitor, monitor],
    [{ ...monitor, labels: { team: 7 } }]
  ])('rejects malformed, cross-application, or ambiguous evidence %#', async value => {
    http.apiMessageGet.mockResolvedValue(value);
    await expect(loadMonitorsByApp('springboot3')).rejects.toBeInstanceOf(MonitorContractError);
  });

  it('rejects an empty application without issuing a request', async () => {
    await expect(loadMonitorsByApp('  ')).rejects.toBeInstanceOf(MonitorContractError);
    expect(http.apiMessageGet).not.toHaveBeenCalled();
  });
});
