/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const controller = vi.hoisted(() => ({ useNoticeRuleController: vi.fn() }));
vi.mock('../controller/notice-rule-controller', () => controller);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { NoticeRulePage } from './notice-rule-page';
import type { NoticeRuleOperationRecovery } from '../model/notice-rule-operation-state';
import type { NoticeRuleDraft } from '../model/notice-rule-model';

describe('Notice rule page action admission', () => {
  afterEach(cleanup);

  it('keeps guest reads and refresh while replacing every mutation control with read-only state', () => {
    const guest = view({ canCreate: false, canEdit: false, canToggle: false, canDelete: false });
    guest.state.list.records.push({ ...rule, id: 32, name: 'Paused', enable: false });
    controller.useNoticeRuleController.mockReturnValue(guest);
    render(<NoticeRulePage />);

    expect(screen.queryByRole('button', { name: 'noticeRules.new' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'common.edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'noticeRules.delete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getAllByText('noticeRules.enabled')).not.toHaveLength(0);
    expect(screen.getByText('noticeRules.disabled')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.query' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.refresh' }));
    expect(guest.actions.search).toHaveBeenCalledOnce();
    expect(guest.actions.refresh).toHaveBeenCalledOnce();
  });

  it('shows user create, edit, and toggle controls without delete', () => {
    controller.useNoticeRuleController.mockReturnValue(
      view({ canCreate: true, canEdit: true, canToggle: true, canDelete: false })
    );
    render(<NoticeRulePage />);

    expect(screen.getByRole('button', { name: 'noticeRules.new' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'noticeRules.delete' })).not.toBeInTheDocument();
  });

  it('shows every administrator action and only an admitted retained retry', () => {
    const administrator = view({ canCreate: true, canEdit: true, canToggle: true, canDelete: true });
    administrator.state.recovery = {
      kind: 'delete',
      phase: 'proof',
      failure: 'unavailable',
      retryable: true
    };
    administrator.state.canRetryOperation = true;
    administrator.state.command = 'recovering';
    controller.useNoticeRuleController.mockReturnValue(administrator);
    const rendered = render(<NoticeRulePage />);

    expect(screen.getByRole('button', { name: 'noticeRules.new' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'noticeRules.delete' })).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: 'common.retry' });
    expect(retry).toBeEnabled();
    expect(retry).not.toHaveClass('ant-btn-loading');

    administrator.state.command = 'deleting';
    controller.useNoticeRuleController.mockReturnValue(administrator);
    rendered.rerender(<NoticeRulePage />);
    const busyRetry = screen.getByRole('button', { name: /common.retry/ });
    expect(busyRetry).toBeDisabled();
    expect(busyRetry).toHaveClass('ant-btn-loading');

    administrator.state.canRetryOperation = false;
    controller.useNoticeRuleController.mockReturnValue(administrator);
    rendered.rerender(<NoticeRulePage />);
    expect(screen.queryByRole('button', { name: 'common.retry' })).not.toBeInTheDocument();
  });

  it('does not paint a draft whose static capability no longer admits submit', () => {
    const guest = view({ canCreate: false, canEdit: false, canToggle: false, canDelete: false });
    guest.state.draft = { ...draft };
    guest.state.canSubmitDraft = false;
    controller.useNoticeRuleController.mockReturnValue(guest);

    render(<NoticeRulePage />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

function view(capabilities: { canCreate: boolean; canEdit: boolean; canToggle: boolean; canDelete: boolean }) {
  return {
    state: {
      capabilities,
      canRetryOperation: false,
      canSubmitDraft: false,
      command: 'idle',
      detail: { kind: 'idle' },
      draft: null as NoticeRuleDraft | null,
      list: { kind: 'ready', records: [rule], total: 1 },
      name: '',
      options: { kind: 'ready' },
      recovery: undefined as NoticeRuleOperationRecovery | undefined,
      query: { name: '', pageIndex: 0, pageSize: 8 },
      receivers: [],
      refreshing: false,
      saving: false,
      templates: [],
      togglingRuleId: null
    },
    actions: {
      changePage: vi.fn(),
      close: vi.fn(),
      create: vi.fn(),
      edit: vi.fn(),
      refresh: vi.fn(),
      remove: vi.fn(),
      retry: vi.fn(),
      retryDetail: vi.fn(),
      search: vi.fn(),
      setName: vi.fn(),
      submit: vi.fn(),
      toggle: vi.fn(),
      updateDraft: vi.fn()
    }
  };
}

const rule = {
  id: 31,
  name: 'Proof',
  receiverId: [11],
  receiverName: ['Email'],
  templateId: null,
  templateName: null,
  enable: true,
  filterAll: true,
  labels: {},
  days: [1, 2, 3, 4, 5, 6, 7],
  periodStart: null,
  periodEnd: null
};

const draft = {
  name: 'Unsaved',
  receiverIds: [11],
  receiverNames: ['Email'],
  templateId: null,
  templateName: null,
  enable: true,
  filterAll: true,
  labelsText: '',
  limitDays: false,
  days: [1, 2, 3, 4, 5, 6, 7],
  periodStart: '',
  periodEnd: ''
};
