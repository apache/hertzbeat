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

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import { ConversationComposer } from './agent-workspace-conversation-chrome';

describe('conversation composer', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('sends with Enter but preserves Shift+Enter', () => {
    const controller = fixture();
    show(controller);
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true });
    expect(controller.actions.send).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(controller.actions.send).toHaveBeenCalledOnce();
  });

  it('never sends while composing or confirming an IME candidate', () => {
    const controller = fixture();
    show(controller);
    const input = screen.getByRole('textbox');
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 229 });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', isComposing: true });
    expect(controller.actions.send).not.toHaveBeenCalled();
  });

  it.each(['x'.repeat(32769), '\u6d4b'.repeat(16385)])('retains oversized drafts and blocks both submission paths', message => {
    const controller = fixture();
    controller.composer = message;
    show(controller);
    expect(screen.getByRole('textbox')).toHaveValue(message);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('aiWorkspace.composer.tooLarge'));
    expect(screen.getByRole('button', { name: i18n.t('aiWorkspace.actions.send') })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', code: 'Enter' });
    expect(controller.actions.send).not.toHaveBeenCalled();
    expect(controller.actions.setComposer).not.toHaveBeenCalled();
  });

  it('accepts a complete manifest-sized message without trimming its fields', () => {
    const controller = fixture();
    controller.composer = 'x'.repeat(8763);
    show(controller);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', code: 'Enter' });
    expect(controller.actions.send).toHaveBeenCalledOnce();
  });

  it.each(['empty', 'streaming', 'running', 'invalid'] as const)('blocks submission when %s', state => {
    const controller = fixture();
    if (state === 'empty') controller.composer = '  ';
    if (state === 'streaming') controller.streaming = true;
    if (state === 'running') controller.run.status = 'running';
    if (state === 'invalid') controller.invalidTarget = true;
    show(controller);
    expect(screen.getByRole('button', { name: i18n.t('aiWorkspace.actions.send') })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', code: 'Enter' });
    expect(controller.actions.send).not.toHaveBeenCalled();
  });
});

function show(controller: AgentWorkspaceViewModel) {
  return render(
    <I18nextProvider i18n={i18n}>
      <ConversationComposer controller={controller} />
    </I18nextProvider>
  );
}

function fixture() {
  return {
    composer: 'Inspect local telemetry',
    streaming: false,
    invalidTarget: false,
    run: { status: 'idle' },
    actions: { send: vi.fn().mockResolvedValue(undefined), setComposer: vi.fn() }
  } as unknown as AgentWorkspaceViewModel;
}
