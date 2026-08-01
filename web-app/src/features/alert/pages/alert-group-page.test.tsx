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

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AlertGroupPage } from './alert-group-page';

const controller = vi.hoisted(() => ({
  capabilities: { canDelete: true, canWrite: true },
  changePage: vi.fn(),
  closeDraft: vi.fn(),
  create: vi.fn(),
  edit: vi.fn(),
  refresh: vi.fn(),
  remove: vi.fn(),
  removeMany: vi.fn(),
  retry: vi.fn(),
  retryDetail: vi.fn(),
  setSearch: vi.fn(),
  selectIds: vi.fn(),
  state: {},
  submit: vi.fn(),
  submitSearch: vi.fn(),
  toggle: vi.fn(),
  updateDraft: vi.fn()
}));
vi.mock('../controller/use-alert-group-controller', () => ({ useAlertGroupController: () => controller }));
vi.mock('../components/alert-management-nav', () => ({ AlertManagementNav: () => <nav /> }));
vi.mock('../components/alert-noise-control-nav', () => ({ AlertNoiseControlNav: () => <nav /> }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const record = {
  id: 7,
  name: 'By service',
  groupLabels: ['service'],
  groupWait: 30,
  groupInterval: 300,
  repeatInterval: 0,
  enable: true,
  gmtUpdate: '2026-07-17T09:00:00'
};

describe('AlertGroupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controller.capabilities = { canDelete: true, canWrite: true };
    controller.state = buildState();
  });
  afterEach(cleanup);

  it('renders server LocalDateTime verbatim without browser parsing', () => {
    const parse = vi.spyOn(Date, 'parse');
    render(<AlertGroupPage />);
    expect(screen.getByText('2026-07-17T09:00:00')).toBeInTheDocument();
    expect(parse).not.toHaveBeenCalled();
  });

  it.each([
    ['empty', 'alertGroups.empty'],
    ['unavailable', 'common.unavailable'],
    ['error', 'common.routeError.description']
  ])('renders list state %s honestly', (kind, evidence) => {
    controller.state = buildState({ list: { kind } });
    render(<AlertGroupPage />);
    expect(screen.getByText(evidence)).toBeInTheDocument();
  });

  it('uses the shared operational frame and a compact empty result', () => {
    controller.state = buildState({ list: { kind: 'empty' } });
    render(<AlertGroupPage />);

    expect(document.querySelector('[data-hb-operational-page]')).toHaveAttribute('data-mode', 'data');
    expect(document.querySelector('[data-hb-operational-command-bar]')).toBeInTheDocument();
    expect(document.querySelector('[data-hb-operational-result-region]')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'alertGroups.empty' })).toBeVisible();
    expect(document.querySelector('.ant-empty-image')).not.toBeInTheDocument();
  });

  it('renders loading as table progress without fake empty copy', () => {
    controller.state = buildState({ list: { kind: 'loading' } });
    render(<AlertGroupPage />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByText('alertGroups.empty')).not.toBeInTheDocument();
  });

  it.each([
    ['missing', 'common.notFound.description'],
    ['unavailable', 'common.unavailable'],
    ['error', 'alertGroups.loadFailed']
  ])('renders retryable detail state %s distinctly', (kind, evidence) => {
    controller.state = buildState({ detail: { kind, id: 7 } });
    render(<AlertGroupPage />);
    expect(screen.getByText(evidence)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(controller.retryDetail).toHaveBeenCalledTimes(1);
  });

  it('delegates search, create, edit, and refresh operations', () => {
    render(<AlertGroupPage />);
    fireEvent.change(screen.getByPlaceholderText('alertGroups.search'), { target: { value: 'prod' } });
    fireEvent.click(screen.getByRole('button', { name: 'common.query' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.refresh' }));
    fireEvent.click(screen.getByRole('button', { name: 'alertGroups.new' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));
    expect(controller.setSearch).toHaveBeenCalledWith('prod');
    expect(controller.submitSearch).toHaveBeenCalled();
    expect(controller.refresh).toHaveBeenCalled();
    expect(controller.create).toHaveBeenCalled();
    expect(controller.edit).toHaveBeenCalledWith(7);
  });

  it.each([
    ['GUEST', false, false],
    ['USER', true, false],
    ['ADMIN', true, true]
  ])('shows only shipped Alert Group actions for %s', (_role, canWrite, canDelete) => {
    controller.capabilities = { canWrite, canDelete };
    render(<AlertGroupPage />);

    expect(screen.queryByRole('button', { name: 'alertGroups.new' }) !== null).toBe(canWrite);
    expect(screen.queryByRole('button', { name: 'common.edit' }) !== null).toBe(canWrite);
    expect(screen.queryByRole('button', { name: 'alertGroups.delete' }) !== null).toBe(canDelete);
    expect(screen.queryByRole('checkbox', { name: 'Select all' }) !== null).toBe(canDelete);
    expect(screen.getByRole('switch')).toHaveProperty('disabled', !canWrite);
    expect(screen.getByText('By service')).toBeInTheDocument();
  });

  it('keeps retained recovery evidence visible without offering a role-forbidden retry', () => {
    controller.capabilities = { canWrite: true, canDelete: false };
    controller.state = buildState({
      command: 'recovering',
      recovery: { kind: 'delete', phase: 'proof', failure: 'unavailable', retryable: true }
    });
    render(<AlertGroupPage />);

    expect(screen.getByText('common.unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'common.retry' })).not.toBeInTheDocument();
  });

  it('does not expose stale editor failure actions after write access is lost', () => {
    controller.capabilities = { canWrite: false, canDelete: false };
    controller.state = buildState({ detail: { kind: 'unavailable', id: 7 } });
    render(<AlertGroupPage />);

    expect(screen.queryByText('common.unavailable')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'common.retry' })).not.toBeInTheDocument();
  });

  it('offers canonical server label keys without disabling manual tags', () => {
    controller.state = buildState({
      draft: {
        name: 'New',
        groupLabels: [],
        groupWait: 30,
        groupInterval: 300,
        repeatInterval: 14_400,
        enable: true
      }
    });
    render(<AlertGroupPage />);
    fireEvent.mouseDown(within(screen.getByRole('dialog')).getByRole('combobox'));
    expect(screen.getByText('environment')).toBeInTheDocument();
  });

  it('restores current-page selection and confirms one batch delete', () => {
    const view = render(<AlertGroupPage />);
    const rowCheckbox = screen.getAllByRole('checkbox').at(1);
    expect(rowCheckbox).toBeDefined();
    fireEvent.click(rowCheckbox!);
    expect(controller.selectIds).toHaveBeenCalledWith([7]);

    controller.state = buildState({ selectedIds: [7] });
    view.rerender(<AlertGroupPage />);
    fireEvent.click(screen.getByRole('button', { name: 'alertGroups.deleteSelected' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.delete' }));

    expect(controller.removeMany).toHaveBeenCalledWith([7]);
  });

  it('locks an acknowledged create draft and offers proof retry without claiming save failure', () => {
    controller.state = buildState({
      createAcknowledged: true,
      createProofFailure: 'unavailable',
      draft: {
        name: 'New',
        groupLabels: ['service'],
        groupWait: 30,
        groupInterval: 300,
        repeatInterval: 14_400,
        enable: true
      }
    });
    render(<AlertGroupPage />);

    expect(screen.getByDisplayValue('New')).toBeDisabled();
    expect(screen.getAllByText('common.unavailable')).toHaveLength(1);
    expect(screen.queryByText('alertGroups.saveFailed')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(controller.submit).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(controller.closeDraft).toHaveBeenCalledOnce();
  });

  it('makes every editor command inert while another operation owns the gate', () => {
    controller.state = buildState({
      command: 'operating',
      draft: {
        name: 'New',
        groupLabels: ['service'],
        groupWait: 30,
        groupInterval: 300,
        repeatInterval: 14_400,
        enable: true
      }
    });
    render(<AlertGroupPage />);

    expect(screen.getByDisplayValue('New')).toBeDisabled();
    const save = screen.getByRole('button', { name: 'common.save' });
    const cancel = screen.getByRole('button', { name: 'common.cancel' });
    expect(save).toBeDisabled();
    expect(cancel).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    fireEvent.click(save);
    fireEvent.click(cancel);
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape', keyCode: 27 });
    expect(controller.submit).not.toHaveBeenCalled();
    expect(controller.closeDraft).not.toHaveBeenCalled();
  });

  it('renders unavailable row-operation recovery with a proof-only retry', () => {
    controller.state = buildState({
      command: 'recovering',
      recovery: { kind: 'delete', phase: 'proof', failure: 'unavailable', retryable: true }
    });
    render(<AlertGroupPage />);

    expect(screen.getByText('common.unavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(controller.retry).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'alertGroups.new' })).toBeDisabled();
  });

  it('renders contract-error update recovery inside the frozen editor', () => {
    controller.state = buildState({
      command: 'recovering',
      draft: { ...record, groupLabels: ['service'] },
      recovery: { kind: 'update', phase: 'proof', failure: 'error', retryable: true }
    });
    render(<AlertGroupPage />);

    expect(screen.getAllByText('common.routeError.description')).toHaveLength(1);
    expect(screen.queryByText('alertGroups.saveFailed')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('By service')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(controller.retry).toHaveBeenCalledOnce();
  });

  it('keeps the single recovery action visible but disabled while proof is running', () => {
    controller.state = buildState({
      command: 'saving',
      draft: { ...record, groupLabels: ['service'] },
      recovery: { kind: 'update', phase: 'proof', failure: 'unavailable', retryable: true }
    });
    render(<AlertGroupPage />);

    expect(screen.getAllByText('common.unavailable')).toHaveLength(1);
    expect(screen.getByText('common.retry').closest('button')).toBeDisabled();
  });

  it('disables an already open delete confirmation when another command starts', () => {
    const view = render(<AlertGroupPage />);
    fireEvent.click(screen.getByRole('button', { name: 'alertGroups.delete' }));
    const confirm = screen.getByRole('button', { name: 'OK' });
    expect(confirm).toBeEnabled();

    controller.state = buildState({ command: 'operating' });
    view.rerender(<AlertGroupPage />);

    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    expect(controller.remove).not.toHaveBeenCalled();
  });
});

function buildState(override: Record<string, unknown> = {}) {
  return {
    command: 'idle',
    createAcknowledged: false,
    createProofFailure: undefined,
    detail: { kind: 'idle' },
    draft: null,
    editorFailure: undefined,
    list: { kind: 'ready', records: [record], total: 1 },
    labelSuggestions: {
      kind: 'received',
      keys: ['alertname', 'instance', 'job', 'severity', 'service', 'host', 'env', 'environment']
    },
    query: { search: '', pageIndex: 0, pageSize: 8 },
    refreshing: false,
    recovery: undefined,
    search: '',
    selectedIds: [],
    ...override
  };
}
