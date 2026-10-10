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

import {
  Refine,
  type BaseRecord,
  type DataProvider,
  type GetListParams,
  type GetListResponse,
  type HttpError
} from '@refinedev/core';
import { useTable } from '@refinedev/antd';
import routerProvider from '@refinedev/react-router';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntApp, Button, ConfigProvider, Form, Input, Table } from 'antd';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

type LabelRecord = BaseRecord & {
  id: number;
  name: string;
};

type SearchForm = {
  search?: string;
};

type ListCall = {
  currentPage: number;
  pageSize: number;
  search: string;
};

const labels: LabelRecord[] = [
  { id: 1, name: 'Alpha' },
  { id: 2, name: 'Beta' },
  { id: 3, name: 'Gamma' }
];

afterEach(cleanup);

describe('official Refine Ant Design compatibility gate', () => {
  it('uses one Refine-owned QueryClientProvider with the supplied client', async () => {
    const queryClient = createQueryClient();
    const mount = vi.spyOn(queryClient, 'mount');

    render(<OfficialStackHarness queryClient={queryClient} provider={createDataProvider([])} />);

    expect(await screen.findByTestId('query-client')).toHaveTextContent('shared');
    expect(mount).toHaveBeenCalledTimes(1);
  });

  it('connects official useTable to real Ant Design Form and Table', async () => {
    const calls: ListCall[] = [];
    render(<OfficialStackHarness queryClient={createQueryClient()} provider={createDataProvider(calls)} />);

    expect(await screen.findByText('Alpha')).toBeVisible();
    expect(screen.getAllByRole('table').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(calls.at(-1)).toMatchObject({ currentPage: 2, pageSize: 2 }));
    expect(await screen.findByText('Gamma')).toBeVisible();

    const callCount = calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(calls.length).toBeGreaterThan(callCount));

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'Beta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Query' }));

    await waitFor(() => expect(calls.at(-1)).toMatchObject({ currentPage: 1, search: 'Beta' }));
    expect(await screen.findByText('Beta')).toBeVisible();
    expect(screen.queryByText('Gamma')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('filters[0][field]=search'));
  });

  it('hydrates useTable from a direct structured URL', async () => {
    const betaUrl = structuredFilterUrl('Beta');
    render(
      <OfficialStackHarness
        queryClient={createQueryClient()}
        provider={createDataProvider([])}
        initialEntries={[betaUrl]}
      />
    );

    expect(await screen.findByText('Beta')).toBeVisible();
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });

  it('exposes that official useTable does not converge after browser POP', async () => {
    const betaUrl = structuredFilterUrl('Beta');
    const calls: ListCall[] = [];
    render(
      <OfficialStackHarness
        queryClient={createQueryClient()}
        provider={createDataProvider(calls)}
        initialEntries={['/labels', betaUrl]}
        initialIndex={1}
      />
    );

    expect(await screen.findByText('Beta')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^$/));
    // This is incompatibility evidence, not desired behavior: the URL pops, but useTable keeps the stale filter.
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeVisible();
    expect(calls.at(-1)).toMatchObject({ search: 'Beta' });

    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('Beta'));
    expect(await screen.findByText('Beta')).toBeVisible();
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });
});

function OfficialStackHarness({
  queryClient,
  provider,
  initialEntries = ['/labels'],
  initialIndex
}: {
  queryClient: QueryClient;
  provider: DataProvider;
  initialEntries?: string[];
  initialIndex?: number;
}) {
  return (
    <ConfigProvider>
      <AntApp>
        <MemoryRouter initialEntries={initialEntries} {...(initialIndex === undefined ? {} : { initialIndex })}>
          <Refine
            dataProvider={provider}
            routerProvider={routerProvider}
            resources={[{ name: 'labels', list: '/labels' }]}
            options={{
              disableTelemetry: true,
              disableRouteChangeHandler: true,
              reactQuery: { clientConfig: queryClient }
            }}
          >
            <LabelTable expectedQueryClient={queryClient} />
          </Refine>
        </MemoryRouter>
      </AntApp>
    </ConfigProvider>
  );
}

function LabelTable({ expectedQueryClient }: { expectedQueryClient: QueryClient }) {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { tableProps, searchFormProps, setCurrentPage, tableQuery } = useTable<
    LabelRecord,
    HttpError,
    SearchForm,
    LabelRecord
  >({
    resource: 'labels',
    syncWithLocation: true,
    pagination: { currentPage: 1, pageSize: 2, mode: 'server' },
    onSearch: ({ search }) => (search?.trim() ? [{ field: 'search', operator: 'contains', value: search.trim() }] : [])
  });

  return (
    <section>
      <output data-testid="query-client">{queryClient === expectedQueryClient ? 'shared' : 'different'}</output>
      <output data-testid="location">{location.search}</output>
      <Form<SearchForm> {...searchFormProps}>
        <Form.Item<SearchForm> name="search" label="Search">
          <Input />
        </Form.Item>
        <Button htmlType="submit">Query</Button>
      </Form>
      <Button onClick={() => setCurrentPage?.(current => current + 1)}>Next page</Button>
      <Button onClick={() => void tableQuery.refetch()}>Refresh</Button>
      <Button
        onClick={() => {
          void navigate(-1);
        }}
      >
        Back
      </Button>
      <Button
        onClick={() => {
          void navigate(1);
        }}
      >
        Forward
      </Button>
      <Table<LabelRecord> {...tableProps} rowKey="id">
        <Table.Column<LabelRecord> dataIndex="name" title="Label" />
      </Table>
    </section>
  );
}

function createDataProvider(calls: ListCall[]): DataProvider {
  return {
    getList<TData extends BaseRecord>(params: GetListParams): Promise<GetListResponse<TData>> {
      const currentPage = params.pagination?.currentPage ?? 1;
      const pageSize = params.pagination?.pageSize ?? 2;
      const searchFilter = params.filters?.find(filter => 'field' in filter && filter.field === 'search');
      const search = searchFilter && 'value' in searchFilter ? String(searchFilter.value ?? '') : '';
      calls.push({ currentPage, pageSize, search });
      const filtered = search ? labels.filter(label => label.name.includes(search)) : labels;
      const start = (currentPage - 1) * pageSize;
      return Promise.resolve({
        data: filtered.slice(start, start + pageSize) as unknown as TData[],
        total: filtered.length
      });
    },
    getOne() {
      return Promise.reject(new Error('not used'));
    },
    create() {
      return Promise.reject(new Error('not used'));
    },
    update() {
      return Promise.reject(new Error('not used'));
    },
    deleteOne() {
      return Promise.reject(new Error('not used'));
    },
    getApiUrl: () => ''
  };
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
}

function structuredFilterUrl(search: string) {
  const query = new URLSearchParams({ currentPage: '1', pageSize: '2' });
  query.set('filters[0][field]', 'search');
  query.set('filters[0][operator]', 'contains');
  query.set('filters[0][value]', search);
  return `/labels?${query.toString()}`;
}
