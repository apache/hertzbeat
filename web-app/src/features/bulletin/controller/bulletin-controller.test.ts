/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiMessageError } from '@/core/http/api-message';
import { QueryClient } from '@tanstack/react-query';
import { MonitorContractError } from '@/features/monitor';
import * as monitorApi from '@/features/monitor';
import * as bulletinApi from '../api/bulletin-api';
import {
  buildBulletinDependencyRecords,
  classifyBulletinMonitorError,
  loadBulletinApps
} from './bulletin-dependencies-controller';
import { reconcileBulletinSelection } from './bulletin-list-controller';
import { refreshSavedBulletinMetrics } from './bulletin-metrics-controller';
import { bulletinQueryKeys } from './bulletin-query-keys';

describe('bulletin controller boundaries', () => {
  afterEach(() => vi.restoreAllMocks());
  it('preserves invalid, unavailable, and unexpected monitor failures', () => {
    expect(classifyBulletinMonitorError(new MonitorContractError('bad metadata'))).toBe('invalid');
    expect(classifyBulletinMonitorError(new ApiMessageError('private', { status: 401 }))).toBe('permission');
    expect(classifyBulletinMonitorError(new ApiMessageError('private', { status: 403 }))).toBe('permission');
    expect(classifyBulletinMonitorError(new ApiMessageError('offline', { status: 503 }))).toBe('unavailable');
    expect(classifyBulletinMonitorError(new Error('unexpected'))).toBe('error');
  });

  it('forwards the resolved locale and cancellation when loading application metadata', async () => {
    const signal = new AbortController().signal;
    const apps = [{ value: 'website', label: 'Website', hide: false }];
    const load = vi.spyOn(monitorApi, 'loadMonitorApps').mockResolvedValue(apps);
    await expect(loadBulletinApps('en-US', signal)).resolves.toEqual(apps);
    expect(load).toHaveBeenCalledWith('en-US', signal);
  });

  it('keeps monitor-authoring applications even when hidden from definition settings', () => {
    expect(
      buildBulletinDependencyRecords(
        [
          { value: 'website', label: 'Website', hide: true },
          { value: 'redis', label: null },
          { value: 'prometheus', label: 'Prometheus', hide: true },
          { value: '__system__', label: 'System', hide: false },
          { value: null, label: 'Missing value', hide: false }
        ],
        undefined,
        undefined
      ).apps
    ).toEqual([
      { value: 'website', label: 'Website', hide: true },
      { value: 'redis', label: null, hide: null }
    ]);
  });

  it('clears a filtered-out selection only after authoritative list convergence', () => {
    expect(reconcileBulletinSelection(7, { kind: 'loading' })).toBe(7);
    expect(reconcileBulletinSelection(7, { kind: 'ready', records: [{ id: 7 }] })).toBe(7);
    expect(reconcileBulletinSelection(7, { kind: 'ready', records: [{ id: 8 }] })).toBeNull();
    expect(reconcileBulletinSelection(7, { kind: 'empty' })).toBeNull();
    expect(reconcileBulletinSelection(null, { kind: 'ready', records: [{ id: 7 }] })).toBeNull();
  });

  it('replaces stale saved metrics before reporting save convergence', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(bulletinQueryKeys.metrics(7), { name: 'Old', content: [] });
    const fresh = { name: 'Updated', content: [] };
    vi.spyOn(bulletinApi, 'loadBulletinMetrics').mockResolvedValue(fresh);
    await refreshSavedBulletinMetrics(client, 7);
    expect(client.getQueryData(bulletinQueryKeys.metrics(7))).toEqual(fresh);
  });

  it('keeps a failed saved-metrics reread in error state instead of presenting stale data', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(bulletinQueryKeys.metrics(7), { name: 'Old', content: [] });
    vi.spyOn(bulletinApi, 'loadBulletinMetrics').mockRejectedValue(
      new ApiMessageError('store unavailable', { code: 15, status: 200 })
    );
    await expect(refreshSavedBulletinMetrics(client, 7)).rejects.toBeInstanceOf(ApiMessageError);
    expect(client.getQueryState(bulletinQueryKeys.metrics(7))?.status).toBe('error');
  });
});
