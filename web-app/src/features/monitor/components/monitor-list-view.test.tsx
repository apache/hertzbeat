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
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { requireDomElement } from '@/test/dom-element';

import { MonitorListView, type MonitorListViewProps } from './monitor-list-view';

describe('MonitorListView evidence states', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('owns management actions in the header and keeps query actions in one filter band', () => {
    const create = vi.fn();
    const openImport = vi.fn();
    renderView(
      {
        canExport: true,
        monitorImport: { canImport: true, draft: null, invalid: null, failure: null, busy: false },
        monitors: { kind: 'empty' }
      },
      { create, openImport }
    );

    const page = requireDomElement(document.querySelector('[data-hb-operational-page]'), 'Operational page');
    const header = requireDomElement(
      document.querySelector('[data-hb-operational-page-header]'),
      'Operational page header'
    );
    const management = requireDomElement(
      header.querySelector('[data-monitor-management-actions]'),
      'Monitor management actions'
    );
    const filters = screen.getByRole('search');
    expect(page).toContainElement(header);
    expect(header).toContainElement(screen.getByRole('heading', { name: i18n.t('monitor.title') }));
    expect(header.querySelector('[data-hb-operational-page-actions]')).toContainElement(management);
    expect(management).toContainElement(screen.getByRole('link', { name: i18n.t('monitor.help') }));
    expect(management).toContainElement(screen.getByRole('button', { name: i18n.t('monitor.editor.newTitle') }));
    expect(management).toContainElement(screen.getByRole('button', { name: i18n.t('monitor.import.action') }));
    expect(management).toContainElement(screen.getByRole('button', { name: i18n.t('monitor.export.all') }));
    expect(filters).toContainElement(screen.getByRole('button', { name: i18n.t('common.query') }));
    expect(filters).toContainElement(screen.getByRole('button', { name: i18n.t('common.refresh') }));
    expect(filters).not.toContainElement(screen.getByRole('button', { name: i18n.t('monitor.editor.newTitle') }));
    expect(filters).not.toContainElement(screen.getByRole('button', { name: i18n.t('monitor.import.action') }));

    fireEvent.click(screen.getByRole('button', { name: i18n.t('monitor.editor.newTitle') }));
    fireEvent.click(screen.getByRole('button', { name: i18n.t('monitor.import.action') }));
    expect(create).toHaveBeenCalledOnce();
    expect(openImport).toHaveBeenCalledOnce();
  });

  it('keeps permission-gated header management actions absent', () => {
    renderView({
      capabilities: { canRead: true, canWrite: false, canDelete: false, canExport: false, canSelect: false },
      canExport: false,
      monitors: { kind: 'empty' }
    });

    const header = requireDomElement(
      document.querySelector('[data-hb-operational-page-header]'),
      'Operational page header'
    );
    expect(header).toContainElement(screen.getByRole('link', { name: i18n.t('monitor.help') }));
    expect(screen.queryByRole('button', { name: i18n.t('monitor.editor.newTitle') })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('monitor.import.action') })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('monitor.export.all') })).not.toBeInTheDocument();
  });

  it('keeps management and filter commands disabled while an operation is active', () => {
    renderView({
      operating: true,
      canExport: true,
      monitorImport: { canImport: true, draft: null, invalid: null, failure: null, busy: false },
      monitors: { kind: 'empty' }
    });

    expect(screen.getByRole('button', { name: i18n.t('monitor.editor.newTitle') })).toBeDisabled();
    expect(screen.getByRole('button', { name: i18n.t('monitor.import.action') })).toBeDisabled();
    expect(screen.getByRole('button', { name: i18n.t('monitor.export.all') })).toBeDisabled();
    expect(screen.getByRole('button', { name: i18n.t('common.query') })).toBeDisabled();
    expect(screen.getByRole('button', { name: i18n.t('common.refresh') })).toBeDisabled();
  });

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
    renderView({
      monitors: {
        kind: 'ready',
        records: [
          {
            id: 7,
            name: 'epoch',
            app: 'website',
            instance: 'zero',
            status: 1,
            gmtUpdate: 0
          }
        ],
        total: 1
      }
    });
    const row = screen.getByText('epoch').closest('tr');
    expect(row).not.toBeNull();
    expect(row).not.toHaveTextContent('—');
  });

  it('keeps monitor labels visible in the primary row metadata', () => {
    renderView({
      monitors: {
        kind: 'ready',
        records: [
          {
            id: 7,
            name: 'checkout',
            app: 'website',
            instance: 'prod',
            status: 1,
            labels: { team: 'payments', env: 'production' }
          }
        ],
        total: 1
      }
    });

    const row = screen.getByText('checkout').closest('tr');
    expect(row).toHaveTextContent('env:production');
    expect(row).toHaveTextContent('team:payments');
  });

  it('disables selection and every row command while a monitor is disappeared', () => {
    const actions = {
      open: vi.fn(),
      run: vi.fn(),
      selectIds: vi.fn()
    };
    renderView(
      {
        monitors: {
          kind: 'ready',
          records: [
            {
              id: 8,
              name: 'disappeared-monitor',
              app: 'website',
              instance: 'gone',
              status: 1,
              displayState: 'disappeared',
              disappearedAt: 1_000
            }
          ],
          total: 0
        }
      },
      actions
    );

    const row = screen.getByText('disappeared-monitor').closest('tr');
    expect(row).not.toBeNull();
    expect(within(row!).getByRole('checkbox')).toBeDisabled();
    for (const name of ['View', 'Edit', 'Copy', 'Pause', 'Delete']) {
      expect(within(row!).getByRole('button', { name })).toBeDisabled();
    }
    expect(row).toHaveTextContent(i18n.t('monitor.status.unavailable'));
    expect(actions.open).not.toHaveBeenCalled();
    expect(actions.run).not.toHaveBeenCalled();
    expect(actions.selectIds).not.toHaveBeenCalled();
  });

  it('preserves endpoint copy, application drilldown, and discovery target semantics', () => {
    const copyInstance = vi.fn();
    const changeApp = vi.fn();
    renderView(
      {
        monitors: {
          kind: 'ready',
          records: [
            {
              id: 7,
              name: 'checkout',
              app: 'website',
              instance: 'https://checkout.example',
              status: 1,
              scrape: 'static'
            },
            {
              id: 8,
              name: 'discovered',
              app: 'website',
              instance: 'unknow',
              status: 1,
              scrape: 'http_sd'
            }
          ],
          total: 2
        }
      },
      { copyInstance, changeApp }
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: i18n.t('monitor.copyEndpoint', { instance: 'https://checkout.example' })
      })
    );
    expect(copyInstance).toHaveBeenCalledWith('https://checkout.example');

    fireEvent.click(screen.getAllByRole('button', { name: 'website' })[0]!);
    expect(changeApp).toHaveBeenCalledWith('website');

    const discoveryRow = screen.getByText('discovered').closest('tr');
    expect(discoveryRow).toHaveTextContent(i18n.t('monitor.editor.scrapeTypes.http_sd'));
    expect(discoveryRow).not.toHaveTextContent('unknow');
  });

  it('links operators to the monitor help guide', () => {
    renderView({ monitors: { kind: 'empty' } });

    expect(screen.getByRole('link', { name: i18n.t('monitor.help') })).toHaveAttribute(
      'href',
      'https://hertzbeat.apache.org/docs/help/guide/'
    );
  });

  it('shows administrator export actions for all and selected monitors', () => {
    const clearSelection = vi.fn();
    renderView({ canExport: true, selectedIds: [7], monitors: { kind: 'empty' } }, { clearSelection });

    expect(screen.getByRole('button', { name: i18n.t('monitor.export.all') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: i18n.t('monitor.export.selected') })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('monitorActions.clearSelection') }));
    expect(clearSelection).toHaveBeenCalledOnce();
  });

  it('delegates sortable legacy columns to the server query', () => {
    const changeSort = vi.fn();
    renderView(
      {
        monitors: {
          kind: 'ready',
          records: [{ id: 7, name: 'checkout', app: 'website', instance: 'prod', status: 1, gmtUpdate: 0 }],
          total: 1
        }
      },
      { changeSort }
    );

    fireEvent.click(screen.getByRole('columnheader', { name: i18n.t('monitor.name') }));

    expect(changeSort).toHaveBeenCalledWith('name', 'asc');
  });

  it.each([
    ['available', 1, 'pause'],
    ['paused', 0, 'enable']
  ] as const)('confirms the %s row transition before writing', (_label, status, action) => {
    const run = vi.fn();
    renderView(
      {
        monitors: {
          kind: 'ready',
          records: [{ id: 7, name: 'checkout', app: 'website', instance: 'prod', status }],
          total: 1
        }
      },
      { run }
    );

    fireEvent.click(screen.getByRole('button', { name: i18n.t(`monitorActions.${action}`) }));
    expect(run).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        i18n.t(action === 'enable' ? 'monitorActions.rowEnableConfirm' : 'monitorActions.rowPauseConfirm', {
          name: 'checkout'
        })
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(run).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: i18n.t(`monitorActions.${action}`) }));
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(run).toHaveBeenCalledWith(action, [7]);
  });

  it.each(['enable', 'pause'] as const)('confirms the bulk %s transition before writing', action => {
    const runBulk = vi.fn();
    renderView({ selectedIds: [7], monitors: { kind: 'empty' } }, { runBulk });

    fireEvent.click(screen.getByRole('button', { name: i18n.t(`monitorActions.${action}`) }));
    expect(runBulk).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        i18n.t(action === 'enable' ? 'monitorActions.selectedEnableConfirm' : 'monitorActions.selectedPauseConfirm', {
          count: 1
        })
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(runBulk).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: i18n.t(`monitorActions.${action}`) }));
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(runBulk).toHaveBeenCalledWith(action);
  });

  it.each(['row', 'bulk'] as const)('keeps the existing %s delete confirmation', scope => {
    const run = vi.fn();
    const runBulk = vi.fn();
    renderView(
      scope === 'row'
        ? {
            monitors: {
              kind: 'ready',
              records: [{ id: 7, name: 'checkout', app: 'website', instance: 'prod', status: 1 }],
              total: 1
            }
          }
        : { selectedIds: [7], monitors: { kind: 'empty' } },
      { run, runBulk }
    );

    fireEvent.click(screen.getByRole('button', { name: i18n.t('monitorActions.delete') }));
    expect(run).not.toHaveBeenCalled();
    expect(runBulk).not.toHaveBeenCalled();
    expect(screen.getByText(i18n.t('monitorActions.deleteConfirm'))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    if (scope === 'row') expect(run).toHaveBeenCalledWith('delete', [7]);
    else expect(runBulk).toHaveBeenCalledWith('delete');
  });
});

function renderView(
  patch: Partial<MonitorListViewProps['state']>,
  actionPatch: Partial<MonitorListViewProps['actions']> = {}
) {
  const state: MonitorListViewProps['state'] = {
    query: { search: '', app: '', status: '9', labels: '', sort: null, order: null, pageIndex: 0, pageSize: 10 },
    draft: { search: '', labels: '' },
    selectedIds: [],
    operating: false,
    refreshing: false,
    capabilities: { canRead: true, canWrite: true, canDelete: true, canExport: true, canSelect: true },
    canExport: false,
    monitorImport: { canImport: false, draft: null, invalid: null, failure: null, busy: false },
    apps: { kind: 'ready', options: [] },
    monitors: { kind: 'loading' },
    ...patch
  };
  const actions: MonitorListViewProps['actions'] = {
    setSearch: () => undefined,
    setLabels: () => undefined,
    submitSearch: () => undefined,
    submitFilters: () => undefined,
    changeApp: () => undefined,
    changeStatus: () => undefined,
    changeSort: () => undefined,
    changePage: () => undefined,
    refresh: () => Promise.resolve(true),
    create: () => undefined,
    open: () => undefined,
    run: () => undefined,
    runBulk: () => undefined,
    exportSelected: () => Promise.resolve(true),
    exportAll: () => Promise.resolve(true),
    openImport: () => undefined,
    cancelImport: () => undefined,
    selectImportFile: () => undefined,
    submitImport: () => Promise.resolve(true),
    copyInstance: () => Promise.resolve(true),
    selectIds: () => undefined,
    clearSelection: () => undefined,
    ...actionPatch
  };
  return render(
    <I18nextProvider i18n={i18n}>
      <MonitorListView state={state} actions={actions} />
    </I18nextProvider>
  );
}
