/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/core/http/http-client', () => http);

import { buildMonitorExportPath, MonitorExportError, requestMonitorExport } from './monitor-export-api';

describe('monitor export API', () => {
  beforeEach(() => http.apiFetch.mockReset());

  it('builds canonical selected and all export paths', () => {
    expect(buildMonitorExportPath({ kind: 'selected', ids: [9, 3] }, 'JSON')).toBe(
      '/api/monitors/export?ids=9&ids=3&type=JSON'
    );
    expect(buildMonitorExportPath({ kind: 'all' }, 'EXCEL')).toBe('/api/monitors/export/all?type=EXCEL');
    expect(() => buildMonitorExportPath({ kind: 'selected', ids: [] }, 'JSON')).toThrow(
      'Selected monitor export requires ids'
    );
  });

  it('returns a non-empty download artifact without reading telemetry or error text', async () => {
    http.apiFetch.mockResolvedValue(
      new Response('[]', {
        status: 200,
        headers: {
          'Content-Disposition': 'attachment;filename=monitor.json',
          'Content-Type': 'application/octet-stream'
        }
      })
    );

    const artifact = await requestMonitorExport({ kind: 'selected', ids: [7] }, 'JSON');
    expect(artifact.filename).toBe('monitor.json');
    expect(artifact.data.size).toBe(2);
    expect(http.apiFetch).toHaveBeenCalledWith('/api/monitors/export?ids=7&type=JSON', {
      signal: undefined
    });
  });

  it.each([
    [403, 'forbidden'],
    [503, 'unavailable'],
    [500, 'error']
  ] as const)('classifies HTTP %s without exposing the response body', async (status, kind) => {
    http.apiFetch.mockResolvedValue(new Response('private backend detail', { status }));

    await expect(requestMonitorExport({ kind: 'all' }, 'JSON')).rejects.toMatchObject({ kind });
  });

  it('rejects an HTTP 200 JSON error envelope and an empty file', async () => {
    http.apiFetch
      .mockResolvedValueOnce(
        new Response('{"code":15,"msg":"private"}', {
          status: 200,
          headers: { 'Content-Type': 'application/problem+json' }
        })
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { 'Content-Type': 'application/octet-stream' }
        })
      );

    await expect(requestMonitorExport({ kind: 'all' }, 'JSON')).rejects.toBeInstanceOf(MonitorExportError);
    await expect(requestMonitorExport({ kind: 'all' }, 'JSON')).rejects.toBeInstanceOf(MonitorExportError);
  });
});
