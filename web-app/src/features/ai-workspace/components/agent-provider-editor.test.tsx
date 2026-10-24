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
import { AgentProviderEditor } from './agent-provider-editor';
import type { AgentProviderViewModel } from '../model/agent-workspace-view-model';
import type { AgentProviderConfiguration } from '../model/agent-provider-contract';
const options = ['openai-chat', 'openai-responses', 'anthropic-messages'].map(code => ({
  type: 'protocol',
  code,
  label: code,
  defaultBaseUrl: null,
  defaultModel: null,
  requiredFields: []
}));
function controller(): AgentProviderViewModel {
  return {
    options: [
      ...options,
      {
        type: 'openai-compatible',
        code: 'custom',
        label: 'OpenAI Compatible',
        defaultBaseUrl: null,
        defaultModel: null,
        requiredFields: []
      }
    ],
    phase: 'ready',
    actions: {
      reload: vi.fn(),
      create: vi.fn().mockResolvedValue(true),
      update: vi.fn().mockResolvedValue(true),
      delete: vi.fn(),
      activate: vi.fn(),
      activateDefault: vi.fn(),
      discoverModels: vi.fn(),
      clearModels: vi.fn()
    }
  };
}
function show(view: AgentProviderViewModel, provider: AgentProviderConfiguration | null = null) {
  return render(
    <I18nextProvider i18n={i18n}>
      <AgentProviderEditor controller={view} provider={provider} close={vi.fn()} />
    </I18nextProvider>
  );
}
const legacy = {
  uid: 'legacy',
  type: 'openai-compatible',
  code: 'custom',
  baseUrl: 'https://example.invalid/v1',
  model: 'old-model',
  apiKeyConfigured: true
};
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
describe('simplified connection editor', () => {
  it('has one primary connection selector and excludes the retired duplicate option', async () => {
    show(controller());
    expect(screen.getByRole('combobox', { name: 'Connection type' })).toBeEnabled();
    expect(screen.queryByRole('combobox', { name: 'Protocol' })).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Connection type' }));
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Connection type' })).toHaveAttribute('aria-expanded', 'true')
    );
    expect(screen.getByText('anthropic-messages')).toBeInTheDocument();
    expect(screen.queryByText('OpenAI Compatible')).not.toBeInTheDocument();
  });
  it('discovers a draft before entering a connection name or a model', async () => {
    const view = controller();
    show(view);
    fireEvent.change(screen.getByLabelText('Base URL'), { target: { value: 'https://example.invalid/v1' } });
    fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'test-key' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch models' }));
    await waitFor(() =>
      expect(view.actions.discoverModels).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'https://example.invalid/v1',
          protocol: 'openai-chat',
          name: '',
          model: '',
          apiKey: 'test-key'
        })
      )
    );
    expect(view.actions.create).not.toHaveBeenCalled();
  });
  it('preserves legacy identity and a blank saved API key when editing', async () => {
    const view = controller();
    show(view, legacy);
    fireEvent.change(screen.getByLabelText('Connection name'), { target: { value: 'Renamed legacy' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save provider' }));
    await waitFor(() =>
      expect(view.actions.update).toHaveBeenCalledWith(
        'legacy',
        expect.objectContaining({
          uid: 'legacy',
          type: 'openai-compatible',
          code: 'custom',
          model: 'old-model',
          name: 'Renamed legacy'
        })
      )
    );
    const input = vi.mocked(view.actions.update).mock.calls[0]?.[1];
    expect(input).not.toHaveProperty('apiKey');
  });
  it('keeps manually entered model IDs available after unsupported discovery', async () => {
    const view = controller();
    view.modelCatalog = { status: 'unsupported', models: [], truncated: false };
    show(view, legacy);
    expect(screen.getByRole('status')).toHaveTextContent('manually');
    fireEvent.change(screen.getByRole('combobox', { name: 'Model' }), { target: { value: 'unlisted-model' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save provider' }));
    await waitFor(() =>
      expect(view.actions.update).toHaveBeenCalledWith('legacy', expect.objectContaining({ model: 'unlisted-model' }))
    );
  });
});
