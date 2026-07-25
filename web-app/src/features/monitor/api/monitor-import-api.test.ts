/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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
vi.mock('@/core/http/api-message', async () => ({
  ...(await vi.importActual<typeof import('@/core/http/api-message')>('@/core/http/api-message')),
  apiMessagePostForm: http.apiMessagePostForm
}));

import { importMonitorConfig, MonitorImportError } from './monitor-import-api';

describe('monitor import API', () => {
  beforeEach(() => http.apiMessagePostForm.mockReset());

  it('posts the selected file as the canonical multipart field with cancellation', async () => {
    const file = new File(['[]'], 'monitors.json');
    const signal = new AbortController().signal;
    http.apiMessagePostForm.mockResolvedValue(undefined);

    await importMonitorConfig(file, signal);

    expect(http.apiMessagePostForm).toHaveBeenCalledWith('/api/monitors/import', expect.any(FormData), { signal });
    const form = http.apiMessagePostForm.mock.calls[0]?.[1] as FormData;
    expect(form.get('file')).toBe(file);
  });

  it('rejects unsupported files before transport', async () => {
    await expect(importMonitorConfig(new File(['x'], 'monitors.yml'))).rejects.toMatchObject({ kind: 'validation' });
    expect(http.apiMessagePostForm).not.toHaveBeenCalled();
  });

  it('maps transport failures without exposing their messages', async () => {
    const cases = [
      [() => new ApiMessageError('private', { status: 403 }), 'forbidden'],
      [() => new ApiMessageError('private', { status: 400 }), 'validation'],
      [() => new ApiMessageError('private', { status: 503 }), 'unavailable'],
      [() => new ApiMessageError('private', { cause: new Error('offline') }), 'unavailable'],
      [() => new ApiMessageError('private', { status: 422 }), 'validation'],
      [() => new Error('private'), 'error']
    ] as const;

    for (const [createFailure, kind] of cases) {
      http.apiMessagePostForm.mockRejectedValueOnce(createFailure());
      let error: unknown;
      try {
        await importMonitorConfig(new File(['[]'], 'monitors.json'));
      } catch (reason) {
        error = reason;
      }
      expect({
        instance: error instanceof MonitorImportError,
        name: error instanceof Error ? error.name : undefined,
        kind: error instanceof MonitorImportError ? error.kind : undefined,
        message: error instanceof Error ? error.message : undefined
      }).toEqual({ instance: true, name: 'MonitorImportError', kind, message: 'Monitor import failed' });
    }
  });
});
