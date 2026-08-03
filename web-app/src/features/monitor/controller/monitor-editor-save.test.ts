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

import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildMonitorPayload } from '../model/monitor-editor-payload';

const api = vi.hoisted(() => ({ saveMonitor: vi.fn() }));
vi.mock('../api/monitor-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/monitor-api')>()),
  ...api
}));

import type { MonitorEditorCommandInput } from './monitor-editor-command-model';
import { saveAcknowledgedMonitor } from './monitor-editor-save';

describe('saveAcknowledgedMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('finishes an acknowledged create without blocking on identity read-back', async () => {
    const input: MonitorEditorCommandInput = {
      mode: 'new',
      id: undefined,
      source: 'new:mysql',
      draft: undefined,
      defines: [],
      returnTo: '/monitors',
      navigate: vi.fn(),
      queryClient: new QueryClient(),
      message: { warning: vi.fn(), success: vi.fn(), error: vi.fn() },
      text: {
        validation: 'validation',
        detectSuccess: 'detectSuccess',
        detectFailed: 'detectFailed',
        saveSuccess: 'saveSuccess',
        saveFailed: 'saveFailed',
        saveUnknown: 'saveUnknown'
      }
    };

    await saveAcknowledgedMonitor(
      input,
      buildMonitorPayload({ name: 'database', app: 'mysql' }, '', []),
      new AbortController().signal
    );

    expect(api.saveMonitor).toHaveBeenCalledTimes(1);
  });

  it('rejects an edit command without a monitor id before writing', async () => {
    const input: MonitorEditorCommandInput = {
      mode: 'edit',
      id: undefined,
      source: 'edit:missing',
      draft: undefined,
      defines: [],
      returnTo: '/monitors',
      navigate: vi.fn(),
      queryClient: new QueryClient(),
      message: { warning: vi.fn(), success: vi.fn(), error: vi.fn() },
      text: {
        validation: 'validation',
        detectSuccess: 'detectSuccess',
        detectFailed: 'detectFailed',
        saveSuccess: 'saveSuccess',
        saveFailed: 'saveFailed',
        saveUnknown: 'saveUnknown'
      }
    };

    await expect(
      saveAcknowledgedMonitor(input, buildMonitorPayload({}, '', []), new AbortController().signal)
    ).rejects.toThrow('A monitor id is required when editing');
    expect(api.saveMonitor).not.toHaveBeenCalled();
  });
});
