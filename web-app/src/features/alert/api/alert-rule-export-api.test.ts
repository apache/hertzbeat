/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/core/http/http-client', () => http);

import { AlertRuleExportError, buildAlertRuleExportPath, requestAlertRuleExport } from './alert-rule-export-api';

describe('Alert Rule export API', () => {
  beforeEach(() => http.apiFetch.mockReset());

  it('builds a canonical selected export path', () => {
    expect(buildAlertRuleExportPath([9, 7, 9], 'JSON')).toBe('/api/alert/defines/export?ids=7&ids=9&type=JSON');
    expect(buildAlertRuleExportPath([7], 'YAML')).toBe('/api/alert/defines/export?ids=7&type=YAML');
    expect(() => buildAlertRuleExportPath([], 'EXCEL')).toThrow();
  });

  it('returns a nonempty artifact without reading an error envelope', async () => {
    http.apiFetch.mockResolvedValue(
      new Response('rules', {
        status: 200,
        headers: {
          'Content-Disposition': 'attachment;filename=hertzbeat_alertDefine.json',
          'Content-Type': 'application/octet-stream'
        }
      })
    );

    const artifact = await requestAlertRuleExport([7], 'JSON');
    expect(artifact.filename).toBe('hertzbeat_alertDefine.json');
    expect(artifact.data.size).toBe(5);
    expect(http.apiFetch).toHaveBeenCalledWith('/api/alert/defines/export?ids=7&type=JSON');
  });

  it('forwards an explicit cancellation signal without weakening the request options contract', async () => {
    const controller = new AbortController();
    http.apiFetch.mockResolvedValue(new Response('rules'));

    await requestAlertRuleExport([7], 'JSON', controller.signal);

    expect(http.apiFetch).toHaveBeenCalledWith('/api/alert/defines/export?ids=7&type=JSON', {
      signal: controller.signal
    });
  });

  it('uses a safe YAML fallback filename when the backend omits disposition', async () => {
    http.apiFetch.mockResolvedValue(new Response('rules', { status: 200 }));

    await expect(requestAlertRuleExport([7], 'YAML')).resolves.toMatchObject({
      filename: 'hertzbeat-alert-rules.yaml'
    });
  });

  it.each([
    [403, 'forbidden'],
    [503, 'unavailable'],
    [500, 'error']
  ] as const)('classifies HTTP %s without exposing response text', async (status, kind) => {
    http.apiFetch.mockResolvedValue(new Response('private backend detail', { status }));
    await expect(requestAlertRuleExport([7], 'JSON')).rejects.toMatchObject({ kind });
  });

  it('rejects JSON error envelopes and empty downloads', async () => {
    http.apiFetch
      .mockResolvedValueOnce(
        new Response('{"code":15,"msg":"private"}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await expect(requestAlertRuleExport([7], 'JSON')).rejects.toBeInstanceOf(AlertRuleExportError);
    await expect(requestAlertRuleExport([7], 'JSON')).rejects.toBeInstanceOf(AlertRuleExportError);
  });
});
