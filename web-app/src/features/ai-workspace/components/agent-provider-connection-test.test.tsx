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

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import type { AgentProviderViewModel } from '../model/agent-workspace-view-model';
import { AgentProviderEditor } from './agent-provider-editor';

afterEach(cleanup);
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
function mount(phase: 'idle' | 'running' = 'idle') {
  const start = vi.fn().mockResolvedValue(undefined);
  const controller: AgentProviderViewModel = {
    options: [],
    phase: 'ready',
    actions: {
      reload: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      activate: vi.fn(),
      activateDefault: vi.fn()
    },
    connectionTest: { state: { phase }, start, cancel: vi.fn(), reset: vi.fn() }
  };
  render(
    <I18nextProvider i18n={i18n}>
      <AgentProviderEditor
        controller={controller}
        provider={{
          uid: 'saved',
          type: 'openai-compatible',
          code: 'custom',
          baseUrl: 'https://fixture.invalid/v1',
          model: 'saved-model',
          apiKeyConfigured: true,
          protocol: 'responses'
        }}
        close={vi.fn()}
      />
    </I18nextProvider>
  );
  return controller;
}
describe('unsaved provider test form', () => {
  it('sends unsaved values only on click and leaves saved credentials blank', async () => {
    const controller = mount();
    expect(controller.connectionTest!.start).not.toHaveBeenCalled();
    expect(screen.getByLabelText('API key')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'unsaved-model' } });
    expect(controller.connectionTest!.reset).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    await waitFor(() =>
      expect(controller.connectionTest!.start).toHaveBeenCalledWith({
        uid: 'saved',
        type: 'openai-compatible',
        code: 'custom',
        baseUrl: 'https://fixture.invalid/v1',
        model: 'unsaved-model',
        protocol: 'responses'
      })
    );
    expect(controller.actions.update).not.toHaveBeenCalled();
    expect(controller.actions.create).not.toHaveBeenCalled();
  });
  it('disables save and duplicate tests while exposing explicit cancellation', () => {
    const controller = mount('running');
    expect(screen.getByRole('button', { name: 'Save provider' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Test connection' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel test' }));
    expect(controller.connectionTest!.cancel).toHaveBeenCalledOnce();
  });
});
