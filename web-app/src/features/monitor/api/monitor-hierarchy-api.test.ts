/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ apiMessageGet: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...await importOriginal<typeof import('@/core/http/api-message')>(), ...http
}));

import { loadMonitorAppHierarchy, MonitorContractError } from './monitor-api';

const hierarchy = [{
  category: 'network', value: 'website', label: 'Website', isLeaf: false, hide: false,
  children: [{ value: 'summary', label: 'Summary', isLeaf: false, children: [
    { value: 'responseTime', label: 'Response time', isLeaf: true, type: 0, unit: 'ms' }
  ] }]
}];

describe('monitor application hierarchy API', () => {
  beforeEach(() => http.apiMessageGet.mockReset());

  it('encodes the requested app and locale, forwards the signal, and strips unknown fields', async () => {
    const signal = new AbortController().signal;
    http.apiMessageGet.mockResolvedValue([{ ...hierarchy[0], ignored: 'wire-only' }]);

    await expect(loadMonitorAppHierarchy('web/site', 'pt BR', signal)).rejects.toBeInstanceOf(MonitorContractError);
    expect(http.apiMessageGet).toHaveBeenCalledWith('/api/apps/hierarchy/web%2Fsite?lang=pt+BR', { signal });

    http.apiMessageGet.mockReset();
    http.apiMessageGet.mockResolvedValue(hierarchy);
    await expect(loadMonitorAppHierarchy('website', 'en-US')).resolves.toEqual({
      category: 'network', value: 'website', label: 'Website', isLeaf: false, hide: false,
      type: null, unit: null,
      children: [{
        category: null, value: 'summary', label: 'Summary', isLeaf: false, hide: null,
        type: null, unit: null,
        children: [{
          category: null, value: 'responseTime', label: 'Response time', isLeaf: true,
          hide: null, type: 0, unit: 'ms', children: []
        }]
      }]
    });
  });

  it('normalizes the nullable and defaulted fields emitted by the Java hierarchy DTO', async () => {
    http.apiMessageGet.mockResolvedValue([{
      value: 'website', children: [{ value: 'summary', label: null, hide: true, children: null }]
    }]);

    await expect(loadMonitorAppHierarchy('website', 'en-US')).resolves.toEqual({
      category: null, value: 'website', label: null, isLeaf: false, hide: null, type: null, unit: null,
      children: [{
        category: null, value: 'summary', label: null, isLeaf: false, hide: true, type: null, unit: null,
        children: []
      }]
    });
  });

  it.each([
    null, {}, [], [hierarchy[0], hierarchy[0]],
    [{ ...hierarchy[0], value: 'mysql' }],
    [{ ...hierarchy[0], children: [{ value: '', label: 'Summary', children: [] }] }],
    [{ ...hierarchy[0], children: [{ value: 'summary', label: 7, children: [] }] }],
    [{ ...hierarchy[0], children: [{ value: 'summary', children: [{ value: 'status', isLeaf: 'true' }] }] }]
  ])('rejects malformed or conflicting recursive hierarchy evidence %#', async value => {
    http.apiMessageGet.mockResolvedValue(value);
    await expect(loadMonitorAppHierarchy('website', 'en-US')).rejects.toBeInstanceOf(MonitorContractError);
  });

  it('never echoes malformed wire values through a contract error', async () => {
    http.apiMessageGet.mockResolvedValue([{ ...hierarchy[0], children: [{
      value: 'private-wire-value', label: { secret: 'do-not-log' }, children: []
    }] }]);

    let error: unknown;
    try {
      await loadMonitorAppHierarchy('website', 'en-US');
    } catch (reason) {
      error = reason;
    }
    expect(error).toBeInstanceOf(MonitorContractError);
    expect(JSON.stringify(error)).not.toContain('private-wire-value');
    expect(JSON.stringify(error)).not.toContain('do-not-log');
  });
});
