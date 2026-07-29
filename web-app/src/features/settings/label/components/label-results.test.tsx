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
import type { TableProps } from 'antd';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { isValidElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LabelRecord } from '../model/label-model';
import { LabelResults } from './label-results';

type CapturedTableProps = TableProps<LabelRecord>;

const table = vi.hoisted(() => ({ props: undefined as CapturedTableProps | undefined }));

vi.mock('antd', async importOriginal => {
  const actual = await importOriginal<typeof import('antd')>();
  return {
    ...actual,
    Table: (props: CapturedTableProps) => {
      table.props = props;
      return <div data-testid="label-table" />;
    }
  };
});
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

const record: LabelRecord = {
  id: 17,
  name: 'environment',
  tagValue: 'production',
  description: 'Production workload',
  type: 1,
  gmtCreate: '2026-01-02T03:04:05Z'
};

describe('LabelResults', () => {
  afterEach(() => {
    table.props = undefined;
    cleanup();
  });

  it('converts Ant pages to model indexes and ignores unsupported page sizes', () => {
    const callbacks = renderResults();
    const pagination = readPagination();

    expect(pagination).toMatchObject({
      current: 3,
      pageSize: 20,
      pageSizeOptions: [20, 50, 100],
      total: 33
    });
    pagination.onChange?.(4, 50);
    expect(callbacks.onPageChange).toHaveBeenCalledWith(3, 50);

    pagination.onChange?.(5, 25);
    expect(callbacks.onPageChange).toHaveBeenCalledTimes(1);
  });

  it('keeps row actions on their record and falls back to creation time', async () => {
    const callbacks = renderResults();
    const expectedTime = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(Date.parse(String(record.gmtCreate)));

    render(
      <App>
        {renderColumn('labels.label', undefined)}
        {renderColumn('labels.updated', undefined)}
        {renderColumn('common.actions', undefined)}
      </App>
    );

    expect(screen.getByText(expectedTime)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'environment:production' }));
    fireEvent.click(screen.getByRole('button', { name: 'labels.copy' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'labels.delete' }));
    fireEvent.click(await screen.findByRole('button', { name: 'OK' }));

    expect(callbacks.onInspect).toHaveBeenCalledWith(record);
    expect(callbacks.onCopy).toHaveBeenCalledWith(record);
    expect(callbacks.onEdit).toHaveBeenCalledWith(record);
    expect(callbacks.onRemove).toHaveBeenCalledWith(record);
  });

  it('locks an open delete confirmation when another write becomes busy', async () => {
    const callbacks = labelCallbacks();
    const results = render(labelResults(callbacks, false));
    const actions = render(<App>{renderColumn('common.actions', undefined)}</App>);

    fireEvent.click(screen.getByRole('button', { name: 'labels.delete' }));
    expect(await screen.findByRole('button', { name: 'OK' })).toBeEnabled();

    results.rerender(labelResults(callbacks, true));
    actions.rerender(<App>{renderColumn('common.actions', undefined)}</App>);
    const confirm = screen.getByRole('button', { name: 'OK' });
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);

    expect(callbacks.onRemove).not.toHaveBeenCalled();
  });

  it('renders permission failure separately from unavailable and generic errors', () => {
    const callbacks = labelCallbacks();
    render(
      <LabelResults
        busy={false}
        canDelete={false}
        canUpdate={false}
        writeLocked={false}
        state={{ kind: 'permission' }}
        pageIndex={0}
        pageSize={20}
        {...callbacks}
      />
    );

    expect(screen.getByText('labels.permission')).toBeInTheDocument();
    expect(screen.queryByText('labels.unavailable')).not.toBeInTheDocument();
  });
});

function renderResults() {
  const callbacks = labelCallbacks();
  render(labelResults(callbacks, false));
  return callbacks;
}

function labelCallbacks() {
  return {
    onPageChange: vi.fn(),
    onCopy: vi.fn(),
    onEdit: vi.fn(),
    onRemove: vi.fn(),
    onInspect: vi.fn()
  };
}

function labelResults(callbacks: ReturnType<typeof labelCallbacks>, busy: boolean) {
  return (
    <LabelResults
      busy={busy}
      canDelete
      canUpdate
      writeLocked={busy}
      state={{ kind: 'ready', records: [record], total: 33 }}
      pageIndex={2}
      pageSize={20}
      {...callbacks}
    />
  );
}

function readPagination() {
  const pagination = table.props?.pagination;
  if (!pagination || typeof pagination === 'boolean') throw new Error('Expected table pagination');
  return pagination;
}

function renderColumn(title: string, value: unknown): ReactNode {
  const column = table.props?.columns?.find(candidate => candidate.title === title);
  if (!column?.render) throw new Error(`Expected ${title} column`);
  const cell = column.render(value, record, 0);
  if (isValidElement(cell)) return cell;
  if (cell && typeof cell === 'object') return 'children' in cell ? cell.children : null;
  return cell;
}
