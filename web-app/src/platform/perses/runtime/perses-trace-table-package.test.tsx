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

import { DataTable } from '@perses-dev/trace-table-plugin';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import i18next from 'i18next';
import en from '@/assets/i18n/explore/en-us.json';
import { traceEvidenceFixture } from '@/test/trace-evidence-fixtures';
import { toPersesTraceSearchData } from './perses-signal-data';
import { traceTableColumns } from './perses-trace-table-columns';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@perses-dev/components', async original => ({
  ...(await original<typeof import('@perses-dev/components')>()),
  useChartsTheme: () => ({}),
  useTimeZone: () => ({ dateFormatOptionsWithUserTimeZone: (options: object) => options }),
  useSelection: () => ({ selectionMap: new Map(), setSelection: vi.fn(), clearSelection: vi.fn() })
}));
vi.mock('@perses-dev/plugin-system', async original => ({
  ...(await original<typeof import('@perses-dev/plugin-system')>()),
  useAllVariableValues: () => ({}),
  useRouterContext: () => ({})
}));
vi.mock('@perses-dev/dashboards', async original => ({
  ...(await original<typeof import('@perses-dev/dashboards')>()),
  useSelectionItemActions: () => ({ getItemActionButtons: vi.fn(), confirmDialog: null })
}));

describe('installed official TraceTable host extension', () => {
  afterEach(cleanup);

  it('renders host display columns in order with compact rows while preserving native data', () => {
    const result = [
      {
        definition: { kind: 'TraceQuery' as const, spec: { plugin: { kind: 'test', spec: {} } } },
        data: { searchResult: [row('first', 1)] }
      }
    ];
    render(
      <DataTable
        options={{}}
        result={result}
        displayColumns={[
          { field: 'traceId', headerName: 'Trace ID', width: 180 },
          { field: 'name', headerName: 'Operation', width: 180, valueGetter: (_, entry) => entry.rootTraceName }
        ]}
        density="compact"
      />
    );
    expect(screen.getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Trace ID', 'Operation']);
    expect(screen.getByRole('grid').closest('.MuiDataGrid-root')).toHaveClass('MuiDataGrid-root--densityCompact');
  });

  it('uses one controlled server page with actual totals and disables stale navigation', () => {
    const onPageChange = vi.fn();
    const result = [
      {
        definition: { kind: 'TraceQuery' as const, spec: { plugin: { kind: 'test', spec: {} } } },
        data: { searchResult: [row('first', 1), row('second', 2)] }
      }
    ];
    const page = { page: 0, pageSize: 2, total: 3, onPageChange, disabled: false };
    const view = render(
      <div style={{ width: 1000, height: 500 }}>
        <DataTable options={{}} result={result} serverPagination={page} />
      </div>
    );
    expect(screen.getByText('1–2 of 3')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Trace name column menu'));
    expect(screen.queryByRole('menuitem', { name: /Filter/u })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('menuitem', { name: /Sort/u })).toHaveLength(0);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: /next page/iu }));
    expect(onPageChange).toHaveBeenCalledWith(1);
    view.rerender(
      <div style={{ width: 1000, height: 500 }}>
        <DataTable
          options={{}}
          result={[{ ...result[0]!, data: { searchResult: [row('third', 3)] } }]}
          serverPagination={{ ...page, page: 1 }}
        />
      </div>
    );
    expect(screen.getByText('3–3 of 3')).toBeInTheDocument();
    expect(screen.queryByText('1–1 of 1')).not.toBeInTheDocument();
    view.rerender(
      <div style={{ width: 1000, height: 500 }}>
        <DataTable options={{}} result={result} serverPagination={{ ...page, page: 1, disabled: true }} />
      </div>
    );
    expect(screen.getByRole('button', { name: /previous page/iu })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /previous page/iu }));
    expect(onPageChange).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])('preserves backend row order only for server pagination: %s', server => {
    const rows = [row('longest-oldest', 300, 1000), row('medium-newest', 200, 3000), row('shortest-middle', 100, 2000)];
    const result = [
      {
        definition: { kind: 'TraceQuery' as const, spec: { plugin: { kind: 'test', spec: {} } } },
        data: { searchResult: rows }
      }
    ];
    const pagination = server
      ? { serverPagination: { page: 0, pageSize: 3, total: 6, disabled: false, onPageChange: vi.fn() } }
      : {};
    const view = render(
      <div style={{ width: 1000, height: 500 }}>
        <DataTable options={{}} result={result} {...pagination} />
      </div>
    );
    expect(rowIds()).toEqual(
      server
        ? ['longest-oldest', 'medium-newest', 'shortest-middle']
        : ['medium-newest', 'shortest-middle', 'longest-oldest']
    );
    if (!server) return;
    expect(
      screen
        .getAllByRole('columnheader')
        .some(header => ['ascending', 'descending'].includes(header.getAttribute('aria-sort') ?? ''))
    ).toBe(false);
    view.rerender(
      <div style={{ width: 1000, height: 500 }}>
        <DataTable
          options={{}}
          result={[
            { ...result[0]!, data: { searchResult: [row('next-longer', 90, 4000), row('next-shorter', 80, 5000)] } }
          ]}
          serverPagination={{ ...pagination.serverPagination!, page: 1 }}
        />
      </div>
    );
    expect(rowIds()).toEqual(['next-longer', 'next-shorter']);
  });

  it('renders nullable root evidence honestly and accepts bounded existing-column overrides', () => {
    const rows = [row('unique', 0.1), row('missing', null), row('ambiguous', null)];
    render(
      <div style={{ width: 1000, height: 500 }}>
        <DataTable
          options={{}}
          result={[
            {
              definition: { kind: 'TraceQuery', spec: { plugin: { kind: 'test', spec: {} } } },
              data: { searchResult: rows }
            }
          ]}
          columnOverrides={{ durationMs: { headerName: 'Root duration' } }}
        />
      </div>
    );
    expect(screen.getByRole('columnheader', { name: /Root duration/u })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Trace name column menu'));
    expect(screen.getByRole('menuitem', { name: /Filter/u })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(within(screen.getByRole('row', { name: /unique/u })).getByText('<1ms')).toBeInTheDocument();
    for (const id of ['missing', 'ambiguous']) {
      const element = screen.getByRole('row', { name: new RegExp(id, 'u') });
      expect(within(element).queryByText('<1ms')).not.toBeInTheDocument();
      expect(within(element).getAllByText('—').length).toBeGreaterThan(0);
    }
  });

  it('sorts missing duration last in both directions and exposes one canonical native link per current row', async () => {
    const i18n = i18next.createInstance();
    await i18n.init({ lng: 'en', resources: { en: { translation: en } } });
    const first = traceEvidenceFixture();
    const second = traceEvidenceFixture({ traceId: '22222222222222222222222222222222', durationNanos: 0 });
    const missing = traceEvidenceFixture({
      traceId: '33333333333333333333333333333333',
      rootState: 'missing',
      rootSpanCount: 0,
      rootSpanId: null,
      rootSpanName: null,
      serviceName: null,
      serviceNamespace: null,
      startTime: null,
      durationNanos: null,
      resourceAttributes: null,
      serviceStats: {},
      unattributedServiceStats: { spanCount: 1, errorCount: 0 }
    });
    const rows = [first, second, missing];
    const links = Object.fromEntries(
      rows.map(row => [row.traceId, '/explore?signal=traces&traceId=' + row.traceId + '&serviceName=checkout'])
    );
    const onNavigate = vi.fn();
    const data = toPersesTraceSearchData({ rows, total: 3 }, false);
    const result = [
      { definition: { kind: 'TraceQuery' as const, spec: { plugin: { kind: 'test', spec: {} } } }, data }
    ];
    const rendered = render(
      <div style={{ width: 1000, height: 500 }}>
        <DataTable
          options={{}}
          result={result}
          columnOverrides={traceTableColumns({ rows, links, onNavigate }, i18n.t)}
        />
      </div>
    );
    expect(screen.getAllByRole('link')).toHaveLength(3);
    const link = screen.getAllByRole('link')[0]!;
    expect(link).toHaveAttribute('href', links[first.traceId]);
    fireEvent.click(link, { ctrlKey: true });
    expect(onNavigate).not.toHaveBeenCalled();
    fireEvent.click(link);
    expect(onNavigate).toHaveBeenCalledWith(links[first.traceId]);
    expect(screen.getByText(new RegExp(en.explore.perses.traceTable.representative, 'u'))).toBeInTheDocument();
    const duration = screen.getByRole('columnheader', { name: /Root duration/u });
    fireEvent.click(duration);
    expect(rowIds()).toEqual([second.traceId, first.traceId, missing.traceId]);
    fireEvent.click(duration);
    expect(rowIds()).toEqual([first.traceId, second.traceId, missing.traceId]);
    rendered.rerender(
      <div style={{ width: 1000, height: 500 }}>
        <DataTable options={{}} result={result} columnOverrides={traceTableColumns({ rows }, i18n.t)} />
      </div>
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

function rowIds() {
  return screen
    .getAllByRole('row')
    .map(row => row.getAttribute('data-id'))
    .filter(Boolean);
}

function row(traceId: string, durationMs: number | null, startTimeUnixMs: number | null = null) {
  return {
    traceId,
    rootServiceName: null,
    rootTraceName: traceId,
    durationMs,
    startTimeUnixMs,
    serviceStats: {}
  };
}
