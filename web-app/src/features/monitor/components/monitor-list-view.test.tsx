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

import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { MonitorListView, type MonitorListViewProps } from './monitor-list-view';

describe('MonitorListView evidence states', () => {
  beforeAll(async () => { await initializeI18n(); await loadLocale('en-US'); });
  afterEach(cleanup);

  it.each([
    ['loading', 'status', ''],
    ['empty', '', 'monitor.empty'],
    ['unavailable', '', 'common.unavailable'],
    ['error', '', 'common.routeError.description']
  ] as const)('does not invent ready rows for %s', (kind, role, messageKey) => {
    renderView({ monitors: { kind } });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    if (role) expect(screen.getByRole(role)).toBeInTheDocument();
    if (messageKey) expect(screen.getByText(i18n.t(messageKey))).toBeInTheDocument();
  });

  it('shows application loading failure instead of an authoritative empty option set', () => {
    renderView({ apps: { kind: 'unavailable' }, monitors: { kind: 'empty' } });
    expect(screen.getByText(i18n.t('common.unavailable'))).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: i18n.t('monitor.application') })).not.toBeInTheDocument();
  });

  it('renders an epoch timestamp as evidence rather than a missing dash', () => {
    renderView({ monitors: { kind: 'ready', records: [{
      id: 7, name: 'epoch', app: 'website', instance: 'zero', status: 1, gmtUpdate: 0
    }], total: 1 } });
    const row = screen.getByText('epoch').closest('tr');
    expect(row).not.toBeNull();
    expect(row).not.toHaveTextContent('—');
  });
});

function renderView(patch: Partial<MonitorListViewProps['state']>) {
  const state: MonitorListViewProps['state'] = {
    query: { search: '', app: '', status: '9', labels: '', pageIndex: 0, pageSize: 10 },
    draft: { search: '', labels: '' }, selectedIds: [], operating: false, refreshing: false,
    apps: { kind: 'ready', options: [] }, monitors: { kind: 'loading' }, ...patch
  };
  const actions: MonitorListViewProps['actions'] = {
    setSearch: () => undefined, setLabels: () => undefined, submitSearch: () => undefined,
    submitFilters: () => undefined, changeApp: () => undefined, changeStatus: () => undefined,
    changePage: () => undefined, refresh: () => Promise.resolve(true), create: () => undefined,
    open: () => undefined, run: () => undefined, runBulk: () => undefined, selectIds: () => undefined
  };
  return render(<I18nextProvider i18n={i18n}><MonitorListView state={state} actions={actions} /></I18nextProvider>);
}
