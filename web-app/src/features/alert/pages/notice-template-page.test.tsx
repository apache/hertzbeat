/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { App } from 'antd';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { requireDomElement } from '@/test/dom-element';

import { noticeTemplateResourceRecord } from '../notice-template-model';
import { NoticeTemplatePage } from './notice-template-page';

const controller = vi.hoisted(() => ({
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
  state: {},
  submit: vi.fn(),
  updateDraft: vi.fn()
}));

vi.mock('../controller/notice-template-controller', () => ({
  useNoticeTemplateController: () => controller
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

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

describe('NoticeTemplatePage', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
  });
  beforeEach(() => {
    vi.clearAllMocks();
    controller.state = buildState({ kind: 'ready', records: [custom, builtIn], total: 2 });
  });
  afterEach(cleanup);

  it('uses the shared operational page header while preserving workspace labeling', () => {
    renderPage();

    const page = requireDomElement(document.querySelector('[data-hb-operational-page]'), 'Operational page');
    const header = requireDomElement(
      document.querySelector('[data-hb-operational-page-header]'),
      'Operational page header'
    );
    expect(page).toContainElement(header);
    expect(header).toContainElement(screen.getByRole('heading', { name: 'noticeTemplates.title' }));
    expect(header.querySelector('[data-hb-operational-page-actions]')).toContainElement(
      screen.getByRole('button', { name: 'noticeTemplates.new' })
    );
    expect(screen.getByRole('region', { name: 'noticeTemplates.title' })).toBeInTheDocument();
  });

  it('delegates toolbar, row, and pagination interactions to the controller', async () => {
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('noticeTemplates.search'), { target: { value: 'Mail' } });
    fireEvent.click(screen.getByRole('button', { name: 'common.query' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.refresh' }));
    fireEvent.click(screen.getByRole('button', { name: 'noticeTemplates.new' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.view' }));
    fireEvent.click(screen.getByRole('button', { name: 'noticeTemplates.delete' }));
    fireEvent.click(await screen.findByRole('button', { name: 'OK' }));

    expect(controller.setName).toHaveBeenCalledWith('Mail');
    expect(controller.query).toHaveBeenCalledTimes(1);
    expect(controller.refresh).toHaveBeenCalledTimes(1);
    expect(controller.create).toHaveBeenCalledTimes(1);
    expect(controller.edit).toHaveBeenCalledWith(custom);
    expect(controller.setPreview).toHaveBeenCalledWith(builtIn);
    expect(controller.remove).toHaveBeenCalledWith(custom);
  });

  it.each([
    [{ kind: 'loading' }, 'notice-template-loading'],
    [{ kind: 'empty' }, 'noticeTemplates.empty'],
    [{ kind: 'unavailable' }, 'common.unavailable'],
    [{ kind: 'error' }, 'common.routeError.description']
  ])('renders the distinct list state %#', async (list, evidence) => {
    controller.state = buildState(list);
    renderPage();

    if (evidence === 'notice-template-loading') expect(screen.getByTestId(evidence)).toBeInTheDocument();
    else expect(await screen.findByText(evidence)).toBeInTheDocument();
    expect(screen.queryByText('Custom')).not.toBeInTheDocument();
  });

  it('keeps source visible in both the query scope and result evidence', () => {
    renderPage();

    expect(screen.getByRole('combobox', { name: 'noticeTemplates.source' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'noticeTemplates.source' })).toBeInTheDocument();
  });

  it('keeps filtering and result evidence in one labeled workspace', () => {
    controller.state = buildState({ kind: 'empty' });
    renderPage();

    const workspace = screen.getByRole('region', { name: 'noticeTemplates.title' });
    expect(workspace).toContainElement(screen.getByRole('combobox', { name: 'noticeTemplates.source' }));
    expect(workspace).toContainElement(screen.getByText('noticeTemplates.empty'));
    expect(workspace).not.toContainElement(screen.getByRole('button', { name: 'noticeTemplates.new' }));
  });

  it('submits and closes the controller-owned draft', async () => {
    controller.state = {
      ...buildState({ kind: 'ready', records: [custom], total: 1 }),
      draft: { id: 42, name: 'Custom', type: 1, content: '${custom}' }
    };
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /common\.save/ }));
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));

    await waitFor(() => expect(controller.submit).toHaveBeenCalledTimes(1));
    expect(controller.closeDraft).toHaveBeenCalledTimes(1);
  });

  it('delegates retry from unavailable state', () => {
    controller.state = buildState({ kind: 'unavailable' });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(controller.refresh).toHaveBeenCalledTimes(1);
  });

  it('uses the projection-only retry while keeping write commands locked', () => {
    controller.state = {
      ...buildState({ kind: 'unavailable' }),
      canRetainRecovery: true,
      canRetryRecovery: true,
      recovery: { stage: 'projection' }
    };
    renderPage();

    expect(screen.getByRole('button', { name: 'noticeTemplates.new' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));

    expect(controller.retryRecovery).toHaveBeenCalledTimes(1);
    expect(controller.refresh).not.toHaveBeenCalled();
  });

  it('exposes an explicit proof-only retry while keeping the acknowledged write locked', () => {
    controller.state = {
      ...buildState({ kind: 'ready', records: [custom], total: 1 }),
      canRetainRecovery: true,
      canRetryRecovery: true,
      draft: { id: 42, name: 'Custom', type: 1, content: '${custom}' },
      recovery: {
        stage: 'update-proof',
        draft: { id: 42, name: 'Custom', type: 1, content: '${custom}' }
      }
    };
    renderPage();

    expect(screen.getByText('noticeTemplates.saveFailed')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));

    expect(controller.retryRecovery).toHaveBeenCalledTimes(1);
    expect(controller.refresh).not.toHaveBeenCalled();
    expect(controller.submit).not.toHaveBeenCalled();
  });

  it('does not repeat submit or close while a command is pending', () => {
    controller.state = {
      ...buildState({ kind: 'ready', records: [custom], total: 1 }),
      command: 'saving',
      draft: { id: 42, name: 'Custom', type: 1, content: '${custom}' }
    };
    renderPage();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(controller.submit).not.toHaveBeenCalled();
    expect(controller.closeDraft).not.toHaveBeenCalled();
  });

  it('restores the preserved draft after a definite write failure retires', () => {
    const page = renderPageWithState({
      ...buildState({ kind: 'ready', records: [custom], total: 1 }),
      command: 'saving',
      draft: { id: 42, name: 'Custom', type: 1, content: '${custom}' }
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    controller.state = {
      ...buildState({ kind: 'ready', records: [custom], total: 1 }),
      draft: { id: 42, name: 'Custom', type: 1, content: '${custom}' }
    };
    page.rerender(pageElement());

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /common\.save/ })).not.toHaveClass('ant-btn-loading');
  });

  it('keeps an unprovable create locked without exposing another write path', () => {
    controller.state = {
      ...buildState({ kind: 'ready', records: [custom], total: 1 }),
      canRetainRecovery: true,
      recovery: { stage: 'commit-uncertain', draft: { name: 'Uncertain', type: 1, content: '${content}' } },
      draft: { name: 'Uncertain', type: 1, content: '${content}' }
    };
    renderPage();

    expect(screen.getByRole('button', { name: 'noticeTemplates.new' })).toBeDisabled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    expect(controller.submit).not.toHaveBeenCalled();
    expect(controller.closeDraft).not.toHaveBeenCalled();
    expect(controller.retryRecovery).not.toHaveBeenCalled();
    expect(screen.getByText('noticeTemplates.saveFailed')).toBeInTheDocument();
  });

  it('keeps delete-proof recovery visible without exposing the editor', () => {
    controller.state = {
      ...buildState({ kind: 'ready', records: [custom], total: 1 }),
      canRetainRecovery: true,
      canRetryRecovery: true,
      draft: { id: 42, name: 'Custom', type: 1, content: '${custom}' },
      recovery: { stage: 'delete-proof', id: 42, record: custom }
    };
    renderPage();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('noticeTemplates.deleteFailed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.retry' })).toBeEnabled();
  });

  it('locks list commands and an already-open delete confirmation while deleting', async () => {
    const page = renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'noticeTemplates.delete' }));
    const confirm = await screen.findByRole('button', { name: 'OK' });

    controller.state = {
      ...buildState({ kind: 'ready', records: [custom, builtIn], total: 2 }),
      command: 'deleting'
    };
    page.rerender(pageElement());

    expect(screen.getByRole('button', { name: 'noticeTemplates.new' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'noticeTemplates.delete' })).toBeDisabled();
    expect(confirm).toBeDisabled();

    fireEvent.click(confirm);
    expect(controller.remove).not.toHaveBeenCalled();
  });
});

function buildState(list: Record<string, unknown>) {
  return {
    capabilities: { canCreate: true, canEdit: true, canDelete: true },
    canRetainActiveOperation: true,
    canRetainRecovery: false,
    canRetryRecovery: false,
    canSubmitDraft: true,
    command: 'idle',
    draft: null,
    list,
    name: '',
    preview: null,
    query: { name: '', preset: false, pageIndex: 0, pageSize: 8 },
    recovery: null,
    refreshing: false
  };
}

function renderPage() {
  return render(pageElement());
}

function renderPageWithState(state: Record<string, unknown>) {
  controller.state = state;
  return renderPage();
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

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
