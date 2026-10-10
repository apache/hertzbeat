/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { PluginList } from './plugin-list';

describe('PluginList', () => {
  afterEach(cleanup);

  it('renders an explicit unknown value when parameter count is absent', () => {
    render(
      <PluginList
        records={[{ id: 11, name: 'audit', enableStatus: true }]}
        total={1}
        query={{ search: '', pageIndex: 0, pageSize: 8 }}
        pageSizes={[8]}
        selectedIds={[]}
        canWrite={false}
        busy={false}
        onSelected={vi.fn()}
        onPage={vi.fn()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onConfigure={vi.fn()}
      />
    );

    expect(screen.getByText('plugins.unknown')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'plugins.configureParams' })).not.toBeInTheDocument();
  });

  it('offers writable configuration only for a positive known parameter count', () => {
    const onConfigure = vi.fn();
    render(
      <PluginList
        records={[{ id: 11, name: 'audit', enableStatus: true, paramCount: 2 }]}
        total={1}
        query={{ search: '', pageIndex: 0, pageSize: 8 }}
        pageSizes={[8]}
        selectedIds={[]}
        canWrite
        busy={false}
        onSelected={vi.fn()}
        onPage={vi.fn()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onConfigure={onConfigure}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'plugins.configureParams' }));
    expect(onConfigure).toHaveBeenCalledWith(expect.objectContaining({ id: 11 }));
  });

  it('keeps actions reachable inside a horizontally scrollable table', () => {
    render(
      <PluginList
        records={[{ id: 11, name: 'audit', enableStatus: true, paramCount: 2 }]}
        total={1}
        query={{ search: '', pageIndex: 0, pageSize: 8 }}
        pageSizes={[8]}
        selectedIds={[]}
        canWrite
        busy={false}
        onSelected={vi.fn()}
        onPage={vi.fn()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onConfigure={vi.fn()}
      />
    );

    expect(screen.getByRole('columnheader', { name: 'common.actions' })).toHaveClass('ant-table-cell-fix-right');
  });

  it('localizes current-page selection in both states', () => {
    const props = {
      records: [{ id: 11, name: 'audit', enableStatus: true }],
      total: 1,
      query: { search: '', pageIndex: 0, pageSize: 8 as const },
      pageSizes: [8] as const,
      canWrite: true,
      busy: false,
      onSelected: vi.fn(),
      onPage: vi.fn(),
      onToggle: vi.fn(),
      onDelete: vi.fn(),
      onConfigure: vi.fn()
    };
    const view = render(<PluginList {...props} selectedIds={[]} />);
    expect(screen.getByRole('checkbox', { name: 'common.tableSelection.selectAll' })).not.toBeChecked();

    view.rerender(<PluginList {...props} selectedIds={[11]} />);
    expect(screen.getByRole('checkbox', { name: 'common.tableSelection.clearAll' })).toBeChecked();
  });
});
