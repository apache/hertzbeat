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

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AlertRuleListPage } from './alert-rule-list-page';

const controller = vi.hoisted(() => ({
  changePage: vi.fn(),
  create: vi.fn(),
  edit: vi.fn(),
  exportSelected: vi.fn(),
  importActions: {
    cancel: vi.fn(),
    inspect: vi.fn(),
    open: vi.fn(),
    selectFile: vi.fn(),
    submit: vi.fn()
  },
  refresh: vi.fn(),
  remove: vi.fn(),
  removeMany: vi.fn(),
  selectIds: vi.fn(),
  setSearch: vi.fn(),
  state: {},
  submitSearch: vi.fn(),
  toggle: vi.fn()
}));
vi.mock('../controller/use-alert-rule-list-controller', () => ({ useAlertRuleListController: () => controller }));
vi.mock('../components/alert-management-nav', () => ({ AlertManagementNav: () => <nav /> }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const record = {
  id: 7,
  name: 'CPU',
  type: 'realtime_metric',
  datasource: 'promql',
  expr: 'usage > 90',
  period: 300,
  times: 3,
  labels: {},
  annotations: {},
  template: 'CPU',
  enable: true,
  gmtUpdate: '2026-07-17T09:00:00'
};

describe('AlertRuleListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controller.state = buildState();
  });
  afterEach(cleanup);

  it('renders LocalDateTime verbatim without browser parsing', () => {
    const parse = vi.spyOn(Date, 'parse');
    render(<AlertRuleListPage />);
    expect(screen.getByText('2026-07-17T09:00:00')).toBeInTheDocument();
    expect(parse).not.toHaveBeenCalled();
  });

  it.each([
    ['empty', 'alertRules.empty'],
    ['unavailable', 'common.unavailable'],
    ['error', 'common.routeError.description']
  ])('renders list state %s honestly', (kind, evidence) => {
    controller.state = buildState({ list: { kind } });
    render(<AlertRuleListPage />);
    expect(screen.getByText(evidence)).toBeInTheDocument();
  });

  it('uses the shared operational frame and a compact empty result', () => {
    controller.state = buildState({ list: { kind: 'empty' } });
    render(<AlertRuleListPage />);

    expect(document.querySelector('[data-hb-operational-page]')).toHaveAttribute('data-mode', 'data');
    expect(document.querySelector('[data-hb-operational-command-bar]')).toBeInTheDocument();
    expect(document.querySelector('[data-hb-operational-result-region]')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'alertRules.empty' })).toBeVisible();
    expect(document.querySelector('.ant-empty-image')).not.toBeInTheDocument();
  });

  it('renders loading and out-of-range ready evidence as a table', () => {
    controller.state = buildState({ list: { kind: 'loading' } });
    const view = render(<AlertRuleListPage />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    view.unmount();
    controller.state = buildState({ list: { kind: 'ready', records: [], total: 5 } });
    render(<AlertRuleListPage />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('does not invent nullable strategy, datasource, expression, period, times, or time', () => {
    controller.state = buildState({
      list: {
        kind: 'ready',
        records: [{ ...record, type: null, datasource: null, expr: null, period: null, times: null, gmtUpdate: null }],
        total: 1
      }
    });
    render(<AlertRuleListPage />);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(6);
  });

  it('delegates search, refresh, create, edit, toggle, and delete', () => {
    render(<AlertRuleListPage />);
    fireEvent.change(screen.getByPlaceholderText('alertRules.search'), { target: { value: 'prod' } });
    fireEvent.click(screen.getByRole('button', { name: 'common.query' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.refresh' }));
    fireEvent.click(screen.getByRole('button', { name: 'alertRules.new' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));
    fireEvent.click(screen.getByRole('switch'));
    expect(controller.setSearch).toHaveBeenCalledWith('prod');
    expect(controller.refresh).toHaveBeenCalled();
    expect(controller.create).toHaveBeenCalled();
    expect(controller.edit).toHaveBeenCalledWith(7);
    expect(controller.toggle).toHaveBeenCalledWith(record, false);
  });

  it('delegates current-page selection and confirms one batch delete', async () => {
    const selection = render(<AlertRuleListPage />);
    fireEvent.click(screen.getAllByRole('checkbox')[1]!);
    expect(controller.selectIds).toHaveBeenCalledWith([7]);

    selection.unmount();
    controller.state = buildState({ selectedIds: [7] });
    render(<AlertRuleListPage />);
    fireEvent.click(screen.getByRole('button', { name: 'alertRules.deleteSelected' }));
    fireEvent.click(await screen.findByRole('button', { name: 'common.delete' }));

    expect(controller.removeMany).toHaveBeenCalledWith([7]);
  });

  it('exports selected rules in the chosen format', async () => {
    controller.state = buildState({ selectedIds: [7] });
    render(<AlertRuleListPage />);
    fireEvent.click(screen.getByRole('button', { name: 'alertRules.export.selected' }));
    fireEvent.click(await screen.findByText('alertRules.export.format.json'));

    expect(controller.exportSelected).toHaveBeenCalledWith([7], 'JSON');
  });

  it('opens the rule import dialog from the list heading', () => {
    render(<AlertRuleListPage />);
    fireEvent.click(screen.getByRole('button', { name: 'alertRules.import.open' }));

    expect(controller.importActions.open).toHaveBeenCalledOnce();
  });

  it('renders guest and user action permissions without enabling rejected writes', () => {
    controller.state = buildState({ capabilities: { canWrite: false, canDelete: false }, selectedIds: [7] });
    const guest = render(<AlertRuleListPage />);
    expect(screen.getByRole('button', { name: 'alertRules.new' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'alertRules.import.open' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeDisabled();
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'alertRules.deleteSelected' })).toBeDisabled();
    guest.unmount();

    controller.state = buildState({ capabilities: { canWrite: true, canDelete: false }, selectedIds: [7] });
    render(<AlertRuleListPage />);
    expect(screen.getByRole('button', { name: 'alertRules.new' })).toBeEnabled();
    expect(screen.getByRole('switch')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'alertRules.deleteSelected' })).toBeDisabled();
  });

  it('locks selection and rule writes while an export owns the selected snapshot', () => {
    controller.state = buildState({ exporting: true, selectedIds: [7] });
    render(<AlertRuleListPage />);

    expect(screen.getByRole('button', { name: /alertRules\.export\.selected/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'alertRules.deleteSelected' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'alertRules.new' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeDisabled();
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getAllByRole('checkbox')[1]).toBeDisabled();
  });

  it('locks list and query actions while an import request is active', () => {
    controller.state = buildState({
      importState: {
        draft: { file: null },
        invalid: null,
        failure: null,
        busy: true,
        inspectionRequired: false
      }
    });
    render(<AlertRuleListPage />);

    expect(screen.getByPlaceholderText('alertRules.search')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.query' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.refresh' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'alertRules.new' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeDisabled();
    expect(screen.getAllByRole('checkbox')[1]).toBeDisabled();
  });

  it('locks every list and query control while a command owns the page', () => {
    controller.state = buildState({ command: 'operating' });
    render(<AlertRuleListPage />);

    expect(screen.getByPlaceholderText('alertRules.search')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.query' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.refresh' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'alertRules.new' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'alertRules.delete' })).toBeDisabled();
    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('keeps refresh and failure retry available while a retained command recovers', () => {
    controller.state = buildState({ command: 'recovering', list: { kind: 'unavailable' } });
    render(<AlertRuleListPage />);

    expect(screen.getByPlaceholderText('alertRules.search')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.query' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'alertRules.new' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.refresh' })).toBeEnabled();
    const recoveryActions = screen.getAllByRole('button', { name: 'common.retry' });
    recoveryActions.forEach(action => expect(action).toBeEnabled());
    fireEvent.click(recoveryActions[0]!);
    expect(controller.refresh).toHaveBeenCalledTimes(1);
  });

  it('visibly locks row commands while canonical proof is recoverable', () => {
    controller.state = buildState({ command: 'recovering' });
    render(<AlertRuleListPage />);

    expect(screen.getByText('alertRules.operationFailed')).toBeVisible();
    expect(screen.getByText('common.routeError.description')).toBeVisible();
    expect(screen.getByRole('button', { name: 'common.retry' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'alertRules.new' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'alertRules.delete' })).toBeDisabled();
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.refresh' })).toBeEnabled();
  });

  it('retires an already open delete confirmation when busy changes', async () => {
    const view = render(<AlertRuleListPage />);
    fireEvent.click(screen.getByRole('button', { name: 'alertRules.delete' }));
    await screen.findByText('alertRules.deleteConfirm');

    controller.state = buildState({ command: 'operating' });
    view.rerender(<AlertRuleListPage />);
    const confirm = screen.getByRole('button', { name: 'OK' });
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    await waitFor(() => expect(controller.remove).not.toHaveBeenCalled());
  });
});

function buildState(override: Record<string, unknown> = {}) {
  return {
    capabilities: { canWrite: true, canDelete: true },
    command: 'idle',
    exporting: false,
    importState: {
      draft: null,
      invalid: null,
      failure: null,
      busy: false,
      inspectionRequired: false
    },
    list: { kind: 'ready', records: [record], total: 1 },
    query: { search: '', pageIndex: 0, pageSize: 8 },
    refreshing: false,
    search: '',
    selectedIds: [],
    ...override
  };
}
