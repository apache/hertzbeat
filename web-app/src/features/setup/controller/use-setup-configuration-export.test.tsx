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

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ exportSetupConfiguration: vi.fn() }));
vi.mock('../api/setup-api', () => api);
const download = vi.hoisted(() => ({ downloadSetupArtifact: vi.fn() }));
vi.mock('./setup-download', () => download);

import { createSetupConfigurationDraft } from '../model/setup-configuration';
import { useSetupConfigurationExport } from './use-setup-configuration-export';

describe('useSetupConfigurationExport', () => {
  it('issues one secret-bearing request when invoked twice before React rerenders', async () => {
    let resolveExport: ((artifact: { blob: Blob; fileName: string; mediaType: string }) => void) | undefined;
    api.exportSetupConfiguration.mockImplementation(() => new Promise(resolve => (resolveExport = resolve)));
    const release = vi.fn();
    const startWrite = vi.fn(() => ({ signal: new AbortController().signal, release }));
    const acknowledgement = {
      operationId: 'external-1',
      state: 'awaiting_external_apply' as const,
      phase: 'external_apply_required' as const,
      nextPollAfterMillis: 500,
      exportAvailable: true
    };
    const draft = createSetupConfigurationDraft();
    const { result } = renderHook(() =>
      useSetupConfigurationExport(acknowledgement, draft, 'configuration_required', 'external_apply', startWrite)
    );

    act(() => {
      void result.current.exportConfiguration('yaml');
      void result.current.exportConfiguration('env');
    });

    expect(api.exportSetupConfiguration).toHaveBeenCalledOnce();
    expect(startWrite).toHaveBeenCalledOnce();

    act(() => {
      resolveExport?.({ blob: new Blob(['opaque']), fileName: 'setup.yml', mediaType: 'application/yaml' });
    });
    await act(() => Promise.resolve());
    expect(download.downloadSetupArtifact).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
  });
});
