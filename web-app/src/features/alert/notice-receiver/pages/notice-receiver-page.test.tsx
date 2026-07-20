/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createNoticeReceiverDraft, type NoticeReceiverDraft } from '../model/notice-receiver-model';
import type { NoticeReceiverTestRecovery } from '../model/notice-receiver-operation-state';

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
    expect(screen.getByPlaceholderText('noticeReceivers.search')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.query' })).toBeDisabled();
  });

  it('keeps recovery persistent and exposes only refresh or retry while uncertain', () => {
    const current = view('ready', true, 'recovering');
    controller.useNoticeReceiverController.mockReturnValue(current);
    render(<NoticeReceiverPage />);

    expect(screen.getByText('noticeReceivers.save.unavailable')).toBeVisible();
    expect(screen.getByRole('button', { name: 'common.refresh' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'common.retry' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'noticeReceivers.new' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'noticeReceivers.delete' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(current.actions.retry).toHaveBeenCalledTimes(1);
  });

  it('locks continuation buttons while a recovery retry is in flight', () => {
    const current = view('ready', true, 'saving');
    current.state.recovery = { kind: 'save', phase: 'projection', retryable: true };
    controller.useNoticeReceiverController.mockReturnValue(current);
    render(<NoticeReceiverPage />);

    expect(screen.getByRole('button', { name: 'common.refresh' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.retry' })).toBeDisabled();
  });

  it('keeps commit-uncertain create visible without offering a continuation that cannot prove identity', () => {
    const current = view('ready', true, 'recovering');
    current.state.recovery = { kind: 'save', phase: 'commit-uncertain', retryable: false };
    controller.useNoticeReceiverController.mockReturnValue(current);
    render(<NoticeReceiverPage />);

    expect(screen.getByText('noticeReceivers.save.unavailable')).toBeVisible();
    expect(screen.getByRole('button', { name: 'common.refresh' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.retry' })).toBeDisabled();
  });

  it('wires uncertain test delivery to explicit retry or cancel actions', () => {
    const current = view('ready', true, 'recovering');
    current.state.recovery = undefined;
    current.state.testRecovery = { phase: 'delivery-uncertain', failure: 'error' };
    current.state.draft = { ...createNoticeReceiverDraft(), name: 'Email', email: 'ops@example.test' };
    current.state.testing = false;
    current.state.saving = false;
    controller.useNoticeReceiverController.mockReturnValue(current);
    render(<NoticeReceiverPage />);

    expect(screen.getByText('noticeReceivers.testError.error')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(current.actions.retryTest).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(current.actions.dismissTestRecovery).toHaveBeenCalledTimes(1);
    expect(current.actions.sendTest).not.toHaveBeenCalled();
  });
});

function view(kind: 'unavailable' | 'ready', busy = false, command = busy ? 'saving' : 'idle') {
  const recovery:
    | {
        kind: 'save';
        phase: 'proof' | 'projection' | 'commit-uncertain';
        retryable: boolean;
      }
    | undefined = command === 'recovering' ? { kind: 'save', phase: 'projection', retryable: true } : undefined;
  return {
    state: {
      query: { name: '', pageIndex: 0, pageSize: 8 },
      name: '',
      draft: null as NoticeReceiverDraft | null,
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
      command,
      recovery,
      testRecovery: undefined as NoticeReceiverTestRecovery | undefined,
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
      sendTest: vi.fn(),
      retryTest: vi.fn(),
      dismissTestRecovery: vi.fn(),
      retry: vi.fn()
    }
  };
}
