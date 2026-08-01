/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { requireDomElement } from '@/test/dom-element';

import { createNoticeReceiverDraft, type NoticeReceiverDraft } from '../model/notice-receiver-model';
import type { NoticeReceiverTestRecovery } from '../model/notice-receiver-operation-state';

const controller = vi.hoisted(() => ({ useNoticeReceiverController: vi.fn() }));
vi.mock('../controller/notice-receiver-controller', () => controller);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { NoticeReceiverPage } from './notice-receiver-page';

describe('NoticeReceiverPage', () => {
  beforeEach(() => controller.useNoticeReceiverController.mockReturnValue(view('unavailable')));
  afterEach(cleanup);

  it('uses the shared operational page header for title copy and create', () => {
    render(<NoticeReceiverPage />);

    const page = requireDomElement(document.querySelector('[data-hb-operational-page]'), 'Operational page');
    const header = requireDomElement(
      document.querySelector('[data-hb-operational-page-header]'),
      'Operational page header'
    );
    expect(page).toContainElement(header);
    expect(header).toContainElement(screen.getByRole('heading', { name: 'noticeReceivers.title' }));
    expect(header.querySelector('[data-hb-operational-page-actions]')).toContainElement(
      screen.getByRole('button', { name: 'noticeReceivers.new' })
    );
    expect(document.querySelector('[data-hb-operational-command-bar]')).toBeInTheDocument();
    expect(document.querySelector('[data-hb-operational-result-region]')).toBeInTheDocument();
  });

  it.each([
    ['guest', { canCreate: false, canEdit: false, canTest: false, canDelete: false }, false, false],
    ['user', { canCreate: true, canEdit: true, canTest: true, canDelete: false }, true, false],
    ['administrator', { canCreate: true, canEdit: true, canTest: true, canDelete: true }, true, true]
  ] as const)('shows only admitted receiver actions for %s', (_role, capabilities, showsEditorActions, canDelete) => {
    const current = view('ready', true);
    current.state.capabilities = capabilities;
    controller.useNoticeReceiverController.mockReturnValue(current);
    render(<NoticeReceiverPage />);

    expect(screen.queryByRole('button', { name: 'noticeReceivers.new' }) !== null).toBe(showsEditorActions);
    expect(screen.queryByRole('button', { name: 'common.edit' }) !== null).toBe(showsEditorActions);
    expect(screen.queryByRole('button', { name: 'noticeReceivers.delete' }) !== null).toBe(canDelete);
    expect(screen.getByText('Pager')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('noticeReceivers.search')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.refresh' })).toBeInTheDocument();
  });

  it('renders storage unavailability distinctly instead of a fake empty table', () => {
    const current = view('unavailable');
    controller.useNoticeReceiverController.mockReturnValue(current);
    render(<NoticeReceiverPage />);
    expect(document.querySelector('[data-state="unavailable"]')).toHaveTextContent('noticeReceivers.read.unavailable');
    expect(screen.queryByText('noticeReceivers.empty')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(current.actions.refresh).toHaveBeenCalledTimes(1);
  });

  it('renders an honest empty state only for a successful empty list', () => {
    controller.useNoticeReceiverController.mockReturnValue(view('ready'));
    render(<NoticeReceiverPage />);
    expect(document.querySelector('[data-state="empty"]')).toHaveTextContent('noticeReceivers.empty');
    expect(document.querySelector('.ant-empty-image')).not.toBeInTheDocument();
  });

  it('uses a compact loading state before authoritative rows exist', () => {
    const current = view('ready');
    current.state.list = { kind: 'loading' } as never;
    controller.useNoticeReceiverController.mockReturnValue(current);
    render(<NoticeReceiverPage />);

    expect(document.querySelector('[data-state="loading"]')).toHaveTextContent('noticeReceivers.loading');
    expect(document.querySelector('table')).not.toBeInTheDocument();
  });

  it('keeps wide receiver actions fixed inside the table viewport', () => {
    const current = view('ready', true);
    current.state.command = 'idle';
    current.state.busy = false;
    controller.useNoticeReceiverController.mockReturnValue(current);
    render(<NoticeReceiverPage />);

    expect(screen.getByRole('columnheader', { name: 'common.actions' })).toHaveClass('ant-table-cell-fix-right');
    expect(document.querySelector('.ant-table-content')).toHaveStyle({ overflowX: 'auto' });
  });

  it('shows refresh progress and prevents overlapping commands', () => {
    const current = view('ready');
    current.state.refreshing = true;
    controller.useNoticeReceiverController.mockReturnValue(current);
    render(<NoticeReceiverPage />);

    expect(screen.getByRole('button', { name: /common\.refresh/ })).toHaveClass('ant-btn-loading');
    expect(screen.getByRole('button', { name: 'common.query' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'noticeReceivers.new' })).toBeDisabled();
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

  it('hides retained delete retry when the current role cannot delete', () => {
    const current = view('ready', true, 'recovering');
    current.state.capabilities = { canCreate: true, canEdit: true, canTest: true, canDelete: false };
    current.state.recovery = { kind: 'delete', phase: 'projection', retryable: true };
    current.state.canRetryOperation = false;
    controller.useNoticeReceiverController.mockReturnValue(current);
    render(<NoticeReceiverPage />);

    expect(screen.getByText('noticeReceivers.deleteError.unavailable')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'common.retry' })).not.toBeInTheDocument();
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
        kind: 'save' | 'delete';
        phase: 'proof' | 'projection' | 'commit-uncertain';
        retryable: boolean;
      }
    | undefined = command === 'recovering' ? { kind: 'save', phase: 'projection', retryable: true } : undefined;
  return {
    state: {
      capabilities: { canCreate: true, canEdit: true, canTest: true, canDelete: true },
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
      canRetryOperation: true,
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
