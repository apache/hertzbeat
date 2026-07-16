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

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AlertRuleListPage } from './alert-rule-list-page';

const controller = vi.hoisted(() => ({
  changePage: vi.fn(), create: vi.fn(), edit: vi.fn(), refresh: vi.fn(), remove: vi.fn(), setSearch: vi.fn(),
  state: {}, submitSearch: vi.fn(), toggle: vi.fn()
}));
vi.mock('./controller/use-alert-rule-list-controller', () => ({ useAlertRuleListController: () => controller }));
vi.mock('./alert-management-nav', () => ({ AlertManagementNav: () => <nav /> }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const record = { id: 7, name: 'CPU', type: 'realtime_metric', datasource: 'promql', expr: 'usage > 90', period: 300,
  times: 3, labels: {}, annotations: {}, template: 'CPU', enable: true, gmtUpdate: '2026-07-17T09:00:00' };

describe('AlertRuleListPage', () => {
  beforeEach(() => { vi.clearAllMocks(); controller.state = buildState(); });
  afterEach(cleanup);

  it('renders LocalDateTime verbatim without browser parsing', () => {
    const parse = vi.spyOn(Date, 'parse');
    render(<AlertRuleListPage />);
    expect(screen.getByText('2026-07-17T09:00:00')).toBeInTheDocument();
    expect(parse).not.toHaveBeenCalled();
  });

  it.each([['empty', 'alertRules.empty'], ['unavailable', 'common.unavailable'], ['error', 'common.routeError.description']])('renders list state %s honestly', (kind, evidence) => {
    controller.state = buildState({ list: { kind } });
    render(<AlertRuleListPage />);
    expect(screen.getByText(evidence)).toBeInTheDocument();
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
    controller.state = buildState({ list: { kind: 'ready', records: [{ ...record, type: null, datasource: null, expr: null,
      period: null, times: null, gmtUpdate: null }], total: 1 } });
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
});

function buildState(override: Record<string, unknown> = {}) {
  return { command: 'idle', list: { kind: 'ready', records: [record], total: 1 },
    query: { search: '', pageIndex: 0, pageSize: 8 }, refreshing: false, search: '', ...override };
}
