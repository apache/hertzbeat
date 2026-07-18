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

import { NoticeTemplatePage } from './notice-template-page';
import { noticeTemplateResourceRecord } from './notice-template-model';

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
  setName: vi.fn(),
  setPreview: vi.fn(),
  state: {},
  submit: vi.fn(),
  updateDraft: vi.fn()
}));

vi.mock('./notice-template-controller', () => ({
  useNoticeTemplateController: () => controller
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const custom = noticeTemplateResourceRecord({
  id: 42, name: 'Custom', type: 1, preset: false, content: '${custom}'
});
const builtIn = noticeTemplateResourceRecord({
  name: 'Built-in', type: 1, preset: true, content: '${preset}'
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

  it('does not repeat submit or close while a command is pending', () => {
    controller.state = {
      ...buildState({ kind: 'ready', records: [custom], total: 1 }),
      command: 'saving',
      draft: { id: 42, name: 'Custom', type: 1, content: '${custom}' }
    };
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /common\.save/ }));
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));

    expect(controller.submit).not.toHaveBeenCalled();
    expect(controller.closeDraft).not.toHaveBeenCalled();
  });
});

function buildState(list: Record<string, unknown>) {
  return {
    command: 'idle',
    draft: null,
    list,
    name: '',
    preview: null,
    query: { name: '', preset: false, pageIndex: 0, pageSize: 8 },
    refreshing: false
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <App><NoticeTemplatePage /></App>
    </MemoryRouter>
  );
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
