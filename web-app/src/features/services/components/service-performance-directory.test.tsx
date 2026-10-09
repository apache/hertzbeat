/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Grid } from 'antd';
import { ServicePerformanceDirectory } from './service-performance-directory';
import type { ServicesViewProps } from '../model/services-model';
import type { ServicePerformancePage } from '../model/service-performance-model';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
beforeEach(() => vi.spyOn(Grid, 'useBreakpoint').mockReturnValue({ sm: true }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const identity = {
  workspaceId: 'default',
  entityId: '7',
  entityType: 'service',
  serviceName: 'checkout',
  serviceNamespace: null,
  deploymentEnvironment: 'prod'
};
const page: ServicePerformancePage = {
  state: 'ready',
  candidateLimit: 500,
  totalElements: 1,
  pageIndex: 0,
  pageSize: 10,
  sort: 'errorCount',
  order: 'desc',
  window: { start: 1000, end: 61000 },
  population: 'observed_server_spans',
  source: 'greptime_flow',
  resolutionSeconds: 60,
  content: [
    {
      entity: {
        id: 7,
        type: 'service',
        name: 'catalog',
        displayName: 'Checkout alias',
        identityCount: 1,
        monitorCount: 0,
        relationCount: 0,
        activeAlertCount: 0
      },
      identity,
      summary: {
        requestCount: 100,
        errorCount: 0,
        errorRate: 0.02,
        requestRatePerSecond: 1,
        latencyAverageMs: null,
        latencyP95Ms: null
      },
      state: 'ready'
    }
  ]
};
const idle = { kind: 'idle' } as const;
const props: ServicesViewProps = {
  state: {
    query: {},
    draft: { search: '', environment: '' },
    list: idle,
    detail: idle,
    red: idle,
    operations: idle,
    freshness: idle,
    validWindow: true,
    timeLabel: '',
    paths: { traces: '', logs: '', metrics: '' },
    performance: { kind: 'ready', data: page }
  },
  actions: {
    query: vi.fn(),
    updateDraft: vi.fn(),
    select: vi.fn(),
    directory: vi.fn(),
    directoryQuery: vi.fn(),
    page: vi.fn(),
    operation: vi.fn(),
    open: vi.fn(),
    refresh: vi.fn()
  }
};
it('shows canonical identity/alias and converts fractional percent once, preserving zero and null', () => {
  render(<ServicePerformanceDirectory {...props} />);
  expect(screen.getByText('2%')).toBeInTheDocument();
  expect(screen.getByText('0')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'services.unknown' })).toHaveTextContent('—');
  expect(screen.getByText('services.observation.ready')).toBeInTheDocument();
  expect(screen.getByText('Checkout alias')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'checkout' }));
  expect(props.actions.select).toHaveBeenCalledWith(7, identity);
});
it.each(['unavailable', 'scope_too_large'] as const)(
  'shows no ranked table for %s and offers explicit registered directory',
  state => {
    render(
      <ServicePerformanceDirectory
        {...props}
        state={{
          ...props.state,
          performance: {
            kind: 'ready',
            data: { ...page, state, totalElements: state === 'unavailable' ? null : 501, content: [] }
          }
        }}
      />
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'services.registered' }));
    expect(props.actions.directoryQuery).toHaveBeenCalledWith({
      view: 'registered',
      sort: undefined,
      order: undefined
    });
  }
);
it.each([0, 5])('recovers empty total %i without hiding an out-of-range page', totalElements => {
  render(
    <ServicePerformanceDirectory
      {...props}
      state={{
        ...props.state,
        query: { search: 'none', pageIndex: 4 },
        performance: { kind: 'ready', data: { ...page, totalElements, content: [] } }
      }}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: totalElements ? 'services.firstPage' : 'services.clearFilters' }));
  if (totalElements) expect(props.actions.page).toHaveBeenCalledWith(0);
  else expect(props.actions.directoryQuery).toHaveBeenCalledWith({ search: '', environmentFilter: '' });
});
it('does not display cached ranking during loading or failure', () => {
  const { rerender } = render(
    <ServicePerformanceDirectory {...props} state={{ ...props.state, performance: { kind: 'loading' } }} />
  );
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  rerender(<ServicePerformanceDirectory {...props} state={{ ...props.state, performance: { kind: 'error' } }} />);
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

it.each([
  ['errorCount', 'services.errorRequests'],
  ['errorRate', 'services.errorRate'],
  ['requestCount', 'services.requests'],
  ['latencyP95Ms', 'services.latencyP95'],
  ['name', 'services.errorRequests']
])('keeps identity and selected %s metric together on narrow screens', (sort, label) => {
  vi.mocked(Grid.useBreakpoint).mockReturnValue({ sm: false });
  render(<ServicePerformanceDirectory {...props} state={{ ...props.state, query: { sort } }} />);
  expect(screen.getAllByRole('columnheader')).toHaveLength(2);
  expect(screen.getByRole('columnheader', { name: label })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'checkout' })).toBeInTheDocument();
  expect(screen.getByText('prod')).toBeInTheDocument();
  expect(screen.getByText('services.observation.ready')).toBeInTheDocument();
  if (sort === 'latencyP95Ms') expect(screen.getByRole('img', { name: 'services.unknown' })).toHaveTextContent('—');
});
it('keeps missing observations explicit in a narrow service cell without inventing zero', () => {
  vi.mocked(Grid.useBreakpoint).mockReturnValue({ sm: false });
  render(
    <ServicePerformanceDirectory
      {...props}
      state={{
        ...props.state,
        performance: {
          kind: 'ready',
          data: { ...page, content: [{ ...page.content[0]!, state: 'empty', summary: null }] }
        }
      }}
    />
  );
  expect(screen.getByText('services.observation.empty')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'services.unknown' })).toHaveTextContent('—');
  expect(screen.queryByText('0')).not.toBeInTheDocument();
});
it('keeps the same sort controls mounted while pending without old ranked row actions', () => {
  const { rerender } = render(<ServicePerformanceDirectory {...props} />);
  const sort = screen.getByRole('combobox', { name: 'services.sort' });
  const order = screen.getByRole('combobox', { name: 'services.order' });
  rerender(<ServicePerformanceDirectory {...props} state={{ ...props.state, performance: { kind: 'loading' } }} />);
  expect(screen.getByRole('combobox', { name: 'services.sort' })).toBe(sort);
  expect(screen.getByRole('combobox', { name: 'services.order' })).toBe(order);
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'checkout' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'common.retry' })).not.toBeInTheDocument();
});
