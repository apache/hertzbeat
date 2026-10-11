/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
    await expect(importAlertRuleDefinitions(new File(['rule'], 'rules.txt'))).rejects.toMatchObject({
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
