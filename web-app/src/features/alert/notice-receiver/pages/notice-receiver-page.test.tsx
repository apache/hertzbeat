/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const controller = vi.hoisted(() => ({ useNoticeReceiverController: vi.fn() }));
vi.mock('../controller/notice-receiver-controller', () => controller);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { NoticeReceiverPage } from './notice-receiver-page';

describe('NoticeReceiverPage', () => {
  beforeEach(() => controller.useNoticeReceiverController.mockReturnValue(view('unavailable')));
  afterEach(cleanup);

  it('renders storage unavailability distinctly instead of a fake empty table', () => {
    render(<NoticeReceiverPage />);
    expect(screen.getByText('noticeReceivers.read.unavailable')).toBeInTheDocument();
    expect(screen.queryByText('noticeReceivers.empty')).not.toBeInTheDocument();
  });

  it('renders an honest empty state only for a successful empty list', () => {
    controller.useNoticeReceiverController.mockReturnValue(view('ready'));
    render(<NoticeReceiverPage />);
    expect(screen.getByText('noticeReceivers.empty')).toBeInTheDocument();
  });

  it('disables draft-context commands synchronously while an operation owns the gate', () => {
    controller.useNoticeReceiverController.mockReturnValue(view('ready', true));
    render(<NoticeReceiverPage />);

    expect(screen.getByRole('button', { name: 'noticeReceivers.new' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'noticeReceivers.delete' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.query' })).toBeEnabled();
  });
});

function view(kind: 'unavailable' | 'ready', busy = false) {
  return {
    state: {
      query: { name: '', pageIndex: 0, pageSize: 8 },
      name: '',
      draft: null,
      list:
        kind === 'ready'
          ? {
              kind: 'ready',
              records: busy
                ? [{ id: 7, name: 'Pager', type: 2, typeKey: 'webhook', options: {}, configuredSecrets: [] }]
                : [],
              total: busy ? 1 : 0
            }
          : { kind },
      command: busy ? 'saving' : 'idle',
      busy,
      testing: busy,
      saving: busy,
      refreshing: false
    },
    actions: {
      setName: vi.fn(),
      search: vi.fn(),
      changePage: vi.fn(),
      refresh: vi.fn(),
      create: vi.fn(),
      edit: vi.fn(),
      remove: vi.fn(),
      close: vi.fn(),
      updateDraft: vi.fn(),
      selectType: vi.fn(),
      setSecretCleared: vi.fn(),
      submit: vi.fn(),
      sendTest: vi.fn()
    }
  };
}
