/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const controller = vi.hoisted(() => ({ useNoticeReceiverController: vi.fn() }));
vi.mock('../controller/notice-receiver-controller', () => controller);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/shared/settings/settings-nav', () => ({ SettingsNav: () => null }));

import { NoticeReceiverPage } from './notice-receiver-page';

describe('NoticeReceiverPage', () => {
  beforeEach(() => controller.useNoticeReceiverController.mockReturnValue(view('unavailable')));

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
});

function view(kind: 'unavailable' | 'ready') {
  return {
    state: { query: { name: '', pageIndex: 0, pageSize: 8 }, name: '', draft: null,
      list: kind === 'ready' ? { kind: 'ready', records: [], total: 0 } : { kind }, testing: false,
      editing: false, saving: false, deleting: false, refreshing: false },
    actions: { setName: vi.fn(), search: vi.fn(), changePage: vi.fn(), refresh: vi.fn(), create: vi.fn(),
      edit: vi.fn(), remove: vi.fn(), close: vi.fn(), updateDraft: vi.fn(), selectType: vi.fn(),
      setSecretCleared: vi.fn(), submit: vi.fn(), sendTest: vi.fn() }
  };
}
