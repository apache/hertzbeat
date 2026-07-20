/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const controller = vi.hoisted(() => ({ useNoticeRuleController: vi.fn() }));
vi.mock('../controller/notice-rule-controller', () => controller);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { NoticeRulePage } from './notice-rule-page';
import type { NoticeRuleDetailState } from '../model/notice-rule-failure';

describe('notice rule page', () => {
  afterEach(cleanup);
  beforeEach(() => controller.useNoticeRuleController.mockReturnValue(view('invalid', 'ready')));

  it('renders invalid list evidence instead of a fake empty table', () => {
    render(<NoticeRulePage />);
    expect(screen.getByText('noticeRules.read.invalid')).toBeInTheDocument();
    expect(screen.queryByText('noticeRules.empty')).not.toBeInTheDocument();
  });

  it('distinguishes a valid empty receiver dependency from storage failure', () => {
    controller.useNoticeRuleController.mockReturnValue(view('empty', 'empty'));
    render(<NoticeRulePage />);
    expect(screen.getByText('noticeRules.options.empty')).toBeInTheDocument();
    expect(screen.getByText('noticeRules.empty')).toBeInTheDocument();
  });

  it.each(['empty', 'invalid', 'unavailable', 'error'] as const)(
    'renders the %s option state distinctly and disables create',
    kind => {
      controller.useNoticeRuleController.mockReturnValue(view('empty', kind));
      render(<NoticeRulePage />);
      expect(screen.getByText(`noticeRules.options.${kind}`)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'noticeRules.new' })).toBeDisabled();
    }
  );

  it('dispatches the next checked state from the list switch', () => {
    const ready = view('empty', 'ready');
    ready.state.list = { kind: 'ready', records: [rule], total: 1 } as never;
    controller.useNoticeRuleController.mockReturnValue(ready);
    render(<NoticeRulePage />);
    expect(screen.getByRole('columnheader', { name: 'noticeRules.enabled' })).toHaveClass('ant-table-cell-fix-right');
    expect(screen.getByRole('columnheader', { name: 'common.actions' })).toHaveClass('ant-table-cell-fix-right');
    fireEvent.click(screen.getByRole('switch'));
    expect(ready.actions.toggle).toHaveBeenCalledWith(rule, false);
  });

  it('disables create and row commands while any write command is busy', () => {
    const busy = view('empty', 'ready');
    busy.state.command = 'deleting';
    busy.state.list = { kind: 'ready', records: [rule], total: 1 } as never;
    controller.useNoticeRuleController.mockReturnValue(busy);
    render(<NoticeRulePage />);

    expect(screen.getByRole('button', { name: 'noticeRules.new' })).toBeDisabled();
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'noticeRules.delete' })).toBeDisabled();
  });

  it('disables option-dependent row commands but keeps delete available when dependencies fail', () => {
    const unavailable = view('empty', 'unavailable');
    unavailable.state.list = { kind: 'ready', records: [rule], total: 1 } as never;
    controller.useNoticeRuleController.mockReturnValue(unavailable);
    render(<NoticeRulePage />);

    expect(screen.getByText('noticeRules.options.unavailable')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'noticeRules.delete' })).toBeEnabled();
  });

  it('renders persistent detail loading evidence while no editor draft is available', () => {
    const loading = view('empty', 'ready', { kind: 'loading', id: 31 });
    controller.useNoticeRuleController.mockReturnValue(loading);

    render(<NoticeRulePage />);

    expect(screen.getByTestId('notice-rule-detail-loading')).toBeInTheDocument();
  });

  it.each(['missing', 'invalid', 'unavailable', 'error'] as const)(
    'renders persistent %s detail evidence and retries that identity',
    kind => {
      const failed = view('empty', 'ready', { kind, id: 31 });
      controller.useNoticeRuleController.mockReturnValue(failed);

      render(<NoticeRulePage />);

      expect(screen.getByText(`noticeRules.read.${kind}`)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
      expect(failed.actions.retryDetail).toHaveBeenCalledOnce();
    }
  );
});

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

function view(
  list: 'invalid' | 'empty',
  options: 'ready' | 'empty' | 'invalid' | 'unavailable' | 'error',
  detail: NoticeRuleDetailState = { kind: 'idle' }
) {
  return {
    state: {
      command: 'idle',
      detail,
      draft: null,
      list: { kind: list },
      name: '',
      options: { kind: options },
      recovery: undefined,
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
