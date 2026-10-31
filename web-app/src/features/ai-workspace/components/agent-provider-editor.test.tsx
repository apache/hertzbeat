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

import type { AgentProviderConfiguration } from '../model/agent-workspace-contract';
import { AgentProviderEditor } from './agent-provider-editor';

describe('AgentProviderEditor explicit protocol', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);
  const legacy: AgentProviderConfiguration = {
    uid: 'fixture',
    type: 'openai-compatible',
    code: 'openai',
    baseUrl: 'https://fixture.invalid/v1',
    model: 'fixture',
    apiKeyConfigured: true
  };
  function mount(provider: AgentProviderConfiguration) {
    const update = vi.fn().mockResolvedValue(true);
    const view = render(
      <I18nextProvider i18n={i18n}>
        <AgentProviderEditor
          provider={provider}
          close={vi.fn()}
          controller={{
            options: [
              {
                type: 'openai-compatible',
                code: 'openai',
                label: 'OpenAI',
                defaultBaseUrl: null,
                defaultModel: null,
                requiredFields: []
              }
            ],
            view: { activeProviderUid: provider.uid, providers: [provider] },
            phase: 'ready',
            actions: {
              reload: vi.fn(),
              create: vi.fn(),
              update,
              delete: vi.fn(),
              activate: vi.fn(),
              activateDefault: vi.fn()
            }
          }}
        />
      </I18nextProvider>
    );
    return { update, ...view };
  }
  it('defaults legacy edits to Chat Completions and leaves the saved key untouched', async () => {
    const { update, container } = mount(legacy);
    expect(screen.getByText('Chat Completions')).toBeInTheDocument();
    expect(screen.getByLabelText('API key')).toHaveValue('');
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('fixture', expect.objectContaining({ protocol: 'chat-completions' }))
    );
    expect(update.mock.calls[0]?.[1]).not.toHaveProperty('apiKey');
  });
  it('preserves an explicitly selected Responses protocol when editing', async () => {
    const { update, container } = mount({ ...legacy, protocol: 'responses' });
    expect(screen.getByText('Responses')).toBeInTheDocument();
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('fixture', expect.objectContaining({ protocol: 'responses' }))
    );
  });
});
