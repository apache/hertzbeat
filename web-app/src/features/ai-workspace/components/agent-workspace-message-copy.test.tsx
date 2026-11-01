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

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { AgentWorkspaceMessage } from './agent-workspace-message';

describe('message copy', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
  it.each(['user', 'assistant'])('copies only original %s text including Markdown', async role => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceMessage
          message={{
            id: 'copy',
            role,
            text: '**Original**\n\n| Name |\n| --- |\n| Monitor |',
            createdAt: '2026-10-18T00:00:00Z'
          }}
        />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: i18n.t('aiWorkspace.message.copy') }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('**Original**\n\n| Name |\n| --- |\n| Monitor |'));
    expect(await screen.findByRole('status')).toHaveTextContent(i18n.t('aiWorkspace.message.copied'));
  });
  it('excludes tool call markers from the text parts', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceMessage
          message={{
            id: 'parts',
            text: 'fallback with audit',
            parts: [
              { type: 'text', text: 'Answer ' },
              { type: 'toolCall', id: 'call', name: 'private.audit' },
              { type: 'text', text: '**body**' }
            ]
          }}
        />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: i18n.t('aiWorkspace.message.copy') }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Answer **body**'));
  });
  it('reports clipboard rejection', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) }
    });
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceMessage message={{ id: 'failed', text: 'Answer' }} />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: i18n.t('aiWorkspace.message.copy') }));
    expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('aiWorkspace.message.copyFailed'));
  });
  it('does not offer message copying for tool results', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AgentWorkspaceMessage message={{ id: 'tool', role: 'toolResult', text: 'private tool output' }} />
      </I18nextProvider>
    );
    expect(screen.queryByRole('button', { name: i18n.t('aiWorkspace.message.copy') })).not.toBeInTheDocument();
  });
});

it('disables copying while generating, then copies the final Markdown', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  const view = render(
    <I18nextProvider i18n={i18n}>
      <AgentWorkspaceMessage message={{ id: 'live', text: 'Partial', status: 'streaming' }} />
    </I18nextProvider>
  );
  expect(screen.getByRole('button', { name: i18n.t('aiWorkspace.message.copyAfterGeneration') })).toBeDisabled();
  view.rerender(
    <I18nextProvider i18n={i18n}>
      <AgentWorkspaceMessage message={{ id: 'live', text: '**Final**', status: 'complete' }} />
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: i18n.t('aiWorkspace.message.copy') }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith('**Final**'));
  cleanup();
});
it('clears success feedback and ignores late clipboard completion after text replacement', async () => {
  vi.useFakeTimers();
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  const view = render(
    <I18nextProvider i18n={i18n}>
      <AgentWorkspaceMessage message={{ id: 'late', text: 'First' }} />
    </I18nextProvider>
  );
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: i18n.t('aiWorkspace.message.copy') }));
    await Promise.resolve();
  });
  expect(screen.getByRole('status')).toHaveTextContent(i18n.t('aiWorkspace.message.copied'));
  act(() => {
    vi.advanceTimersByTime(2600);
  });
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
  let resolve!: () => void;
  writeText.mockImplementationOnce(
    () =>
      new Promise<void>(done => {
        resolve = done;
      })
  );
  fireEvent.click(screen.getByRole('button', { name: i18n.t('aiWorkspace.message.copy') }));
  view.rerender(
    <I18nextProvider i18n={i18n}>
      <AgentWorkspaceMessage message={{ id: 'late', text: 'Replacement' }} />
    </I18nextProvider>
  );
  await act(async () => {
    resolve();
    await Promise.resolve();
  });
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
  expect(screen.getByRole('button', { name: i18n.t('aiWorkspace.message.copy') })).toBeEnabled();
  cleanup();
  vi.useRealTimers();
});
