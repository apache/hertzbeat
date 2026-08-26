/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ apiMessageGet: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  ...http
}));

import { loadMonitorInvestigationBinding } from './monitor-api';
import { MonitorContractError } from '../model/monitor-contract';

describe('monitor investigation API', () => {
  beforeEach(() => http.apiMessageGet.mockReset());

  it('loads one exact persisted Monitor-to-Entity binding and forwards cancellation', async () => {
    const signal = new AbortController().signal;
    http.apiMessageGet.mockResolvedValue({
      monitorId: 42,
      entityId: 7,
      entityType: 'service',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'production',
      signals: ['metrics', 'logs', 'traces']
    });

    await expect(loadMonitorInvestigationBinding(42, signal)).resolves.toEqual({
      monitorId: 42,
      entityId: 7,
      entityType: 'service',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'production',
      signals: ['metrics', 'logs', 'traces']
    });
    expect(http.apiMessageGet).toHaveBeenCalledWith('/api/monitor/42/investigation', { signal });
  });

  it('keeps a missing authoritative binding absent instead of fabricating a route', async () => {
    http.apiMessageGet.mockResolvedValue(null);

    await expect(loadMonitorInvestigationBinding(42)).resolves.toBeUndefined();
  });

  it.each([
    { monitorId: 41, entityId: 7, entityType: 'service', serviceName: 'checkout', signals: ['metrics'] },
    { monitorId: 42, entityId: 7, entityType: 'host', serviceName: 'checkout', signals: ['metrics'] },
    { monitorId: 42, entityId: 7, entityType: 'service', serviceName: 'checkout', signals: ['metrics', 'profiles'] },
    { monitorId: 42, entityId: 7, entityType: 'service', serviceName: 'checkout', signals: ['metrics', 'metrics'] }
  ])('rejects malformed or mismatched binding evidence %#', async value => {
    http.apiMessageGet.mockResolvedValue(value);

    await expect(loadMonitorInvestigationBinding(42)).rejects.toBeInstanceOf(MonitorContractError);
  });

  it.each([0, -1, Number.MAX_SAFE_INTEGER + 1])('rejects invalid Monitor identity %s before I/O', async monitorId => {
    await expect(loadMonitorInvestigationBinding(monitorId)).rejects.toBeInstanceOf(MonitorContractError);
    expect(http.apiMessageGet).not.toHaveBeenCalled();
  });
});
