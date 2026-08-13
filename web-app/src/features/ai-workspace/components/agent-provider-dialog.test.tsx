/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { AgentProviderDialog } from './agent-provider-dialog';

describe('AgentProviderDialog', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('lists configured providers without exposing an API key value', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AgentProviderDialog
          controller={{
            options: [
              {
                type: 'openai-compatible',
                code: 'openai',
                label: 'OpenAI',
                defaultBaseUrl: null,
                defaultModel: null,
                requiredFields: ['apiKey']
              }
            ],
            view: {
              activeProviderUid: 'provider-1',
              providers: [
                {
                  uid: 'provider-1',
                  type: 'openai-compatible',
                  code: 'openai',
                  baseUrl: 'https://example.invalid',
                  model: 'gpt-test',
                  apiKeyConfigured: true
                }
              ]
            },
            phase: 'ready',
            actions: {
              reload: vi.fn(),
              create: vi.fn(),
              update: vi.fn(),
              delete: vi.fn(),
              activate: vi.fn(),
              activateDefault: vi.fn()
            }
          }}
          open
          onClose={vi.fn()}
        />
      </I18nextProvider>
    );

    await waitFor(() => expect(screen.getByText('gpt-test')).toBeInTheDocument());
    expect(screen.getByText('Key configured')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('sk-');
  });
});
