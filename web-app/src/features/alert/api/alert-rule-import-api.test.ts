/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

const http = vi.hoisted(() => ({ apiMessagePostForm: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  apiMessagePostForm: http.apiMessagePostForm
}));

import { AlertRuleImportError, importAlertRuleDefinitions } from './alert-rule-import-api';

describe('Alert Rule import API', () => {
  beforeEach(() => {
    http.apiMessagePostForm.mockReset();
    http.apiMessagePostForm.mockResolvedValue(undefined);
  });

  it('posts the selected document once under the canonical multipart field', async () => {
    const file = new File(['[]'], 'rules.json');
    const signal = new AbortController().signal;

    await importAlertRuleDefinitions(file, signal);

    expect(http.apiMessagePostForm).toHaveBeenCalledWith('/api/alert/defines/import', expect.any(FormData), {
      signal
    });
    const form = http.apiMessagePostForm.mock.calls[0]?.[1] as FormData;
    expect(form.get('file')).toBe(file);
  });

  it('rejects unsupported documents before transport', async () => {
    await expect(importAlertRuleDefinitions(new File(['rule'], 'rules.yml'))).rejects.toMatchObject({
      kind: 'validation',
      outcome: 'rejected'
    });
    expect(http.apiMessagePostForm).not.toHaveBeenCalled();
  });

  it('distinguishes rejected input from outcomes that require inspection', async () => {
    const cases = [
      [new ApiMessageError('private', { status: 403 }), 'forbidden', 'rejected'],
      [new ApiMessageError('private', { status: 422 }), 'validation', 'rejected'],
      [new ApiMessageError('private', { status: 503 }), 'unavailable', 'uncertain'],
      [new ApiMessageError('private', { cause: new Error('offline') }), 'unavailable', 'uncertain'],
      [new ApiMessageError('private', { status: 500 }), 'error', 'uncertain'],
      [new ApiMessageError('private', { status: 200, code: 12 }), 'error', 'uncertain']
    ] as const;

    for (const [failure, kind, outcome] of cases) {
      http.apiMessagePostForm.mockRejectedValueOnce(failure);
      await expect(importAlertRuleDefinitions(new File(['[]'], 'rules.json'))).rejects.toMatchObject({
        name: 'AlertRuleImportError',
        kind,
        outcome,
        message: 'Alert Rule import failed'
      } satisfies Partial<AlertRuleImportError>);
    }
  });
});
