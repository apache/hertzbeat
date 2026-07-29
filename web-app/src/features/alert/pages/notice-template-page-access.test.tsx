/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { App } from 'antd';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const controllerMock = vi.hoisted(() => ({ useNoticeTemplateController: vi.fn() }));
vi.mock('../controller/notice-template-controller', () => controllerMock);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { useNoticeTemplateController } from '../controller/notice-template-controller';
import { noticeTemplateResourceRecord } from '../model/notice-template-model';
import { NoticeTemplatePage } from './notice-template-page';

type TemplateController = ReturnType<typeof useNoticeTemplateController>;

describe('Notice Template page action admission', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
  });
  afterEach(cleanup);

  it('keeps guest reads, filters, refresh, pagination, and previews without mutation or retry controls', () => {
    const guest = controllerView({ canCreate: false, canEdit: false, canDelete: false });
    guest.state.draft = { id: 42, name: 'Stale', type: 1, content: '${content}' };
    guest.state.command = 'saving';
    guest.state.canSubmitDraft = false;
    guest.state.recovery = {
      stage: 'update-proof',
      draft: { id: 42, name: 'Stale', type: 1, content: '${content}' }
    };
    guest.state.canRetryRecovery = false;
    controllerMock.useNoticeTemplateController.mockReturnValue(guest);
    renderPage();

    expect(screen.queryByRole('button', { name: 'noticeTemplates.new' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'common.edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'noticeTemplates.delete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'common.retry' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const previews = screen.getAllByRole('button', { name: 'common.view' });
    expect(previews).toHaveLength(2);
    fireEvent.click(previews[0]!);
    fireEvent.click(previews[1]!);
    fireEvent.click(screen.getByRole('button', { name: 'common.query' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.refresh' }));
    expect(guest.setPreview).toHaveBeenCalledTimes(2);
    expect(guest.query).toHaveBeenCalledOnce();
    expect(guest.refresh).toHaveBeenCalledOnce();
  });

  it('shows user create and custom edit while keeping delete hidden and preset preview-only', () => {
    controllerMock.useNoticeTemplateController.mockReturnValue(
      controllerView({ canCreate: true, canEdit: true, canDelete: false })
    );
    renderPage();

    expect(screen.getByRole('button', { name: 'noticeTemplates.new' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'noticeTemplates.delete' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.view' })).toBeInTheDocument();
  });

  it('shows every administrator custom action while preset remains preview-only', () => {
    controllerMock.useNoticeTemplateController.mockReturnValue(
      controllerView({ canCreate: true, canEdit: true, canDelete: true })
    );
    renderPage();

    expect(screen.getByRole('button', { name: 'noticeTemplates.new' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'noticeTemplates.delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.view' })).toBeInTheDocument();
  });

  it('keeps retained retry enabled and marks only the active retry busy', () => {
    const administrator = controllerView({ canCreate: true, canEdit: true, canDelete: true });
    administrator.state.recovery = {
      stage: 'delete-proof',
      id: 42,
      record: custom
    };
    administrator.state.canRetryRecovery = true;
    controllerMock.useNoticeTemplateController.mockReturnValue(administrator);
    const page = renderPage();

    const retainedRetry = screen.getByRole('button', { name: 'common.retry' });
    expect(retainedRetry).toBeEnabled();
    expect(retainedRetry).not.toHaveClass('ant-btn-loading');

    administrator.state.command = 'recovering';
    administrator.state.canRetainActiveOperation = true;
    controllerMock.useNoticeTemplateController.mockReturnValue(administrator);
    page.rerender(pageElement());
    const activeRetry = screen.getByRole('button', { name: /common.retry/ });
    expect(activeRetry).toBeDisabled();
    expect(activeRetry).toHaveClass('ant-btn-loading');
  });
});

function controllerView(capabilities: {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}): TemplateController {
  return {
    changePage: vi.fn(),
    changePreset: vi.fn(),
    closeDraft: vi.fn(),
    closePreview: vi.fn(),
    create: vi.fn(),
    edit: vi.fn(),
    query: vi.fn(),
    refresh: vi.fn(),
    remove: vi.fn(),
    retryRecovery: vi.fn(),
    setName: vi.fn(),
    setPreview: vi.fn(),
    state: {
      capabilities,
      canRetainActiveOperation: false,
      canRetainRecovery: false,
      canRetryRecovery: false,
      canSubmitDraft: false,
      command: 'idle',
      draft: null,
      list: { kind: 'ready', records: [custom, builtIn], total: 2 },
      name: '',
      preview: null,
      query: { name: '', preset: false, pageIndex: 0, pageSize: 8 },
      recovery: null,
      refreshing: false
    },
    submit: vi.fn(),
    updateDraft: vi.fn()
  };
}

function renderPage() {
  return render(pageElement());
}

function pageElement() {
  return (
    <MemoryRouter>
      <App>
        <NoticeTemplatePage />
      </App>
    </MemoryRouter>
  );
}

const custom = noticeTemplateResourceRecord({
  id: 42,
  name: 'Custom',
  type: 1,
  preset: false,
  content: '${custom}'
});
const builtIn = noticeTemplateResourceRecord({
  name: 'Built-in',
  type: 1,
  preset: true,
  content: '${preset}'
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
