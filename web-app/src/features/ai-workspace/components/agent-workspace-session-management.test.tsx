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
import { ConfigProvider } from 'antd';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import { AgentWorkspaceSessionPane } from './agent-workspace-session-pane';

describe('session management controls', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('groups history and opens one row menu without selecting it', async () => {
    const controller = fixture();
    show(controller);
    expect(screen.getByRole('region', { name: 'Today' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Conversation actions: Local fixture' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Delete conversation/ }));
    expect(controller.actions.requestDeleteSession).toHaveBeenCalledExactlyOnceWith('ags_1');
    expect(controller.actions.selectSession).not.toHaveBeenCalled();
  });

  it('does not equate a raw failed run with zero completed work before details are loaded', () => {
    const controller = fixture();
    controller.sessions.items[0]!.status = 'FAILED';
    show(controller);
    expect(screen.getByText('Not completed · view details')).toBeInTheDocument();
    expect(screen.queryByText('Failed')).not.toBeInTheDocument();
  });

  it('prepares clear-all without deleting', () => {
    const controller = fixture();
    show(controller);
    fireEvent.click(screen.getByRole('button', { name: 'Clear all conversations' }));
    expect(controller.actions.requestClearSessions).toHaveBeenCalledOnce();
    expect(controller.actions.confirmSessionDeletion).not.toHaveBeenCalled();
  });

  it('states exact count, irreversibility and related records, with cancel and confirm', async () => {
    const controller = fixture();
    controller.sessionDeletion = { phase: 'confirming', sessionUids: ['ags_1', 'ags_2'], activeCount: 0 };
    show(controller);
    await waitFor(() =>
      expect(
        screen.getByText(/Permanently delete 2 conversations and their messages, runs and tool records/)
      ).toBeVisible()
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(controller.actions.cancelSessionDeletion).toHaveBeenCalledOnce();
    expect(controller.actions.confirmSessionDeletion).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete (2)' }));
    expect(controller.actions.confirmSessionDeletion).toHaveBeenCalledOnce();
  });

  it('blocks active deletion and keeps destructive controls disabled while committing', async () => {
    const controller = fixture();
    controller.sessionDeletion = { phase: 'confirming', sessionUids: ['ags_1'], activeCount: 1 };
    const view = show(controller);
    expect(await screen.findByRole('button', { name: 'Delete (1)' })).toBeDisabled();
    await waitFor(() => expect(screen.getByText(/Stop running conversations/)).toBeVisible());
    controller.sessionDeletion = { ...controller.sessionDeletion, phase: 'deleting', activeCount: 0 };
    view.rerender(
      <I18nextProvider i18n={i18n}>
        <ConfigProvider theme={{ token: { motion: false } }}>
          <AgentWorkspaceSessionPane
            controller={controller}
            isAdmin={false}
            onOpenProviders={vi.fn()}
            onOpenSchedules={vi.fn()}
          />
        </ConfigProvider>
      </I18nextProvider>
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled());
  });
});

function show(controller: AgentWorkspaceViewModel) {
  return render(
    <I18nextProvider i18n={i18n}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <AgentWorkspaceSessionPane
          controller={controller}
          isAdmin={false}
          onOpenProviders={vi.fn()}
          onOpenSchedules={vi.fn()}
        />
      </ConfigProvider>
    </I18nextProvider>
  );
}
function fixture() {
  return {
    sessions: {
      status: 'ready',
      items: [
        { id: 1, sessionUid: 'ags_1', title: 'Local fixture', status: 'SUCCEEDED', gmtUpdate: new Date().toISOString() }
      ]
    },
    selectedSessionUid: 'ags_1',
    run: { phase: 'idle' },
    sessionDeletion: { phase: 'idle', sessionUids: [], activeCount: 0 },
    actions: {
      selectSession: vi.fn(),
      newInvestigation: vi.fn(),
      requestDeleteSession: vi.fn(),
      requestClearSessions: vi.fn().mockResolvedValue(undefined),
      cancelSessionDeletion: vi.fn(),
      confirmSessionDeletion: vi.fn().mockResolvedValue(undefined)
    }
  } as unknown as AgentWorkspaceViewModel;
}
