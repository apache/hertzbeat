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

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App, ConfigProvider } from 'antd';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  useNoticeReceiverEditorController,
  useNoticeReceiverOperationGate
} from '../controller/use-notice-receiver-editor-controller';
import { requireHtmlElement } from '@/test/dom-element';
import { persistedNoticeReceiver } from '../controller/notice-receiver-controller-test-fixtures';

const writes = vi.hoisted(() => ({ save: vi.fn(), send: vi.fn() }));
const translation = vi.hoisted(() => ({ t: (key: string) => key }));
vi.mock('react-i18next', () => ({ useTranslation: () => translation }));
vi.mock('../controller/notice-receiver-controller', () => ({
  useNoticeReceiverController: () => {
    const capabilities = { canCreate: true, canEdit: true, canTest: true, canDelete: true };
    const gate = useNoticeReceiverOperationGate();
    const editor = useNoticeReceiverEditorController({
      capabilities,
      gate,
      loadExact: () => Promise.resolve(persistedNoticeReceiver)
    });
    return {
      state: {
        ...editor.state,
        capabilities,
        query: { name: '', pageIndex: 0, pageSize: 8 },
        name: '',
        list: { kind: 'ready', records: [persistedNoticeReceiver], total: 1 },
        command: 'idle',
        busy: false,
        saving: false,
        testing: false,
        refreshing: false,
        recovery: undefined,
        testRecovery: undefined
      },
      actions: {
        ...editor.actions,
        setName: vi.fn(),
        search: vi.fn(),
        changePage: vi.fn(),
        refresh: vi.fn(),
        remove: vi.fn(),
        retry: vi.fn(),
        sendTest: writes.send,
        submit: async () => {
          await writes.save();
          editor.controls.setDraft(null);
        }
      }
    };
  }
}));

import { NoticeReceiverPage } from './notice-receiver-page';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function mount(entries = ['/before', '/settings/notifications/receivers', '/after'], initialIndex = 1) {
  const router = createMemoryRouter(
    [
      { path: '/settings/notifications/receivers', element: <NoticeReceiverPage /> },
      { path: '/before', element: <div>Before</div> },
      { path: '/after', element: <div>After</div> }
    ],
    { initialEntries: entries, initialIndex }
  );
  render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <App>
        <RouterProvider router={router} />
      </App>
    </ConfigProvider>
  );
  return router;
}

function open() {
  fireEvent.click(screen.getByRole('button', { name: 'noticeReceivers.new' }));
  return screen.getByRole('textbox', { name: 'noticeReceivers.nameField' });
}

describe('receiver modal history protection', () => {
  it.each([-1, 1])('Cancel preserves route/draft and Discard performs one history transition (%s)', async direction => {
    const router = mount();
    const name = open();
    fireEvent.change(name, { target: { value: 'Unsent receiver' } });
    const originalKey = router.state.location.key;
    await act(() => router.navigate(direction));
    const discard = await screen.findByRole('button', { name: 'common.discardChanges' });
    expect(router.state.location.key).toBe(originalKey);
    const confirmation = requireHtmlElement(discard.closest('[role="dialog"]'), 'History confirmation');
    fireEvent.click(within(confirmation).getByRole('button', { name: 'common.cancel' }));
    await waitFor(() =>
      expect(
        router.state.blockers.size === 0 || [...router.state.blockers.values()].every(b => b.state === 'unblocked')
      ).toBe(true)
    );
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'common.discardChanges' })).not.toBeInTheDocument()
    );
    expect(name).toHaveValue('Unsent receiver');
    expect(router.state.location.key).toBe(originalKey);
    const transitions: string[] = [];
    const unsubscribe = router.subscribe(state => {
      if (state.location.key !== originalKey && transitions.at(-1) !== state.location.key)
        transitions.push(state.location.key);
    });
    await act(() => router.navigate(direction));
    fireEvent.click(await screen.findByRole('button', { name: 'common.discardChanges' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(direction === -1 ? '/before' : '/after'));
    expect(transitions).toHaveLength(1);
    unsubscribe();
    await act(() => router.navigate(-direction));
    expect(open()).toHaveValue('');
    expect(writes.save).not.toHaveBeenCalled();
    expect(writes.send).not.toHaveBeenCalled();
  });

  it('preserves the editor without intercepting query-only history on the same receiver route', async () => {
    const router = mount(['/settings/notifications/receivers?name=old', '/settings/notifications/receivers?name=new']);
    const name = open();
    fireEvent.change(name, { target: { value: 'Unsent same-route draft' } });
    await act(() => router.navigate(-1));
    expect(router.state.location.search).toBe('?name=old');
    expect(name).toHaveValue('Unsent same-route draft');
    expect(screen.queryByRole('button', { name: 'common.discardChanges' })).not.toBeInTheDocument();
    await act(() => router.navigate(1));
    expect(router.state.location.search).toBe('?name=new');
    expect(name).toHaveValue('Unsent same-route draft');
  });

  it.each(['unchanged', 'restored'])('does not block an %s new draft', async mode => {
    const router = mount();
    const name = open();
    if (mode === 'restored') {
      fireEvent.change(name, { target: { value: 'Temporary' } });
      fireEvent.change(name, { target: { value: '' } });
    }
    await act(() => router.navigate(-1));
    expect(router.state.location.pathname).toBe('/before');
    expect(screen.queryByText('common.unsavedChangesConfirm')).not.toBeInTheDocument();
  });

  it('does not block an edited receiver restored to its initial detail', async () => {
    const router = mount();
    fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));
    const name = await screen.findByRole('textbox', { name: 'noticeReceivers.nameField' });
    expect(name).toHaveValue('Pager');
    fireEvent.change(name, { target: { value: 'Temporary' } });
    fireEvent.change(name, { target: { value: 'Pager' } });
    await act(() => router.navigate(1));
    expect(router.state.location.pathname).toBe('/after');
    expect(screen.queryByText('common.unsavedChangesConfirm')).not.toBeInTheDocument();
  });

  it('keeps explicit close as discard and does not block history after mocked successful save', async () => {
    const router = mount();
    fireEvent.change(open(), { target: { value: 'Discard me' } });
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(screen.queryByText('common.unsavedChangesConfirm')).not.toBeInTheDocument();
    fireEvent.change(open(), { target: { value: 'Saved fixture' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'noticeReceivers.fields.email' }), {
      target: { value: 'ops@example.test' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'common.confirm' }));
    await waitFor(() => expect(writes.save).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'noticeReceivers.nameField' })).not.toBeInTheDocument()
    );
    await act(() => router.navigate(-1));
    expect(router.state.location.pathname).toBe('/before');
    expect(screen.queryByText('common.unsavedChangesConfirm')).not.toBeInTheDocument();
    expect(writes.send).not.toHaveBeenCalled();
  });
});
