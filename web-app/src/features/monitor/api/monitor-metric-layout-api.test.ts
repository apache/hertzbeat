/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const transport = vi.hoisted(() => ({
  apiMessageDelete: vi.fn(),
  apiMessageGet: vi.fn(),
  apiMessagePut: vi.fn()
}));

vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  ...transport
}));

import {
  loadMonitorMetricLayout,
  resetMonitorMetricLayout,
  saveMonitorMetricLayout
} from './monitor-metric-layout-api';
import { MonitorMetricLayoutContractError } from './monitor-metric-layout-schema';

describe('monitor metric layout API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the encoded application path and forwards the read signal', async () => {
    const signal = new AbortController().signal;
    transport.apiMessageGet.mockResolvedValue(layout('mysql:custom'));

    await expect(loadMonitorMetricLayout('mysql:custom', signal)).resolves.toEqual(layout('mysql:custom'));

    expect(transport.apiMessageGet).toHaveBeenCalledWith('/api/metrics/layout/mysql%3Acustom', { signal });
  });

  it('rejects a layout returned for a different application identity', async () => {
    transport.apiMessageGet.mockResolvedValue(layout('redis'));

    await expect(loadMonitorMetricLayout('mysql')).rejects.toBeInstanceOf(MonitorMetricLayoutContractError);
  });

  it('puts the complete canonical layout document with its expected revision', async () => {
    const payload = {
      schemaVersion: 1 as const,
      mode: 'custom' as const,
      columns: 12 as const,
      items: layout().items,
      historyDock: { collapsed: false, height: 18 },
      expectedRevision: 'layout-r1'
    };
    transport.apiMessagePut.mockResolvedValue({ ...layout(), revision: 'layout-r2', historyDock: payload.historyDock });

    await expect(saveMonitorMetricLayout('mysql', payload)).resolves.toMatchObject({
      revision: 'layout-r2',
      historyDock: payload.historyDock
    });

    expect(transport.apiMessagePut).toHaveBeenCalledWith('/api/metrics/layout/mysql', payload);
  });

  it.each([null, layout('redis')])('rejects a missing or mismatched save confirmation', async response => {
    transport.apiMessagePut.mockResolvedValue(response);

    await expect(
      saveMonitorMetricLayout('mysql', {
        schemaVersion: 1,
        mode: 'custom',
        columns: 12,
        items: layout().items,
        historyDock: layout().historyDock,
        expectedRevision: 'layout-r1'
      })
    ).rejects.toBeInstanceOf(MonitorMetricLayoutContractError);
  });

  it('encodes the expected revision on reset', async () => {
    transport.apiMessageDelete.mockResolvedValue(undefined);

    await resetMonitorMetricLayout('mysql/custom', 'layout r1/+');

    expect(transport.apiMessageDelete).toHaveBeenCalledWith(
      '/api/metrics/layout/mysql%2Fcustom?expectedRevision=layout+r1%2F%2B'
    );
  });
});

function layout(application = 'mysql') {
  return {
    application,
    revision: 'layout-r1',
    schemaVersion: 1 as const,
    mode: 'custom' as const,
    columns: 12 as const,
    items: [{ group: 'basic', x: 0, y: 0, w: 12 as const, h: 12, collapsed: false, order: 0 }],
    historyDock: { collapsed: false, height: 12 }
  };
}
