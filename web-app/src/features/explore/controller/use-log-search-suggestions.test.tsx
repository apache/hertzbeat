/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { loadLogFacetFields, loadLogFacetValues } from '../api/explore-log-facets-api';
import type { LogFacetValuesResult } from '../model/explore-log-facets';
import type { LogExploreQuery } from '../model/explore-query';
import { useLogSearchSuggestions } from './use-log-search-suggestions';
vi.mock('../api/explore-log-facets-api', async original => ({
  ...(await original<typeof import('../api/explore-log-facets-api')>()),
  loadLogFacetFields: vi.fn(),
  loadLogFacetValues: vi.fn()
}));
const field = { id: 'builtin:serviceName', source: 'builtin', key: 'serviceName' } as const;
const statusField = { id: 'builtin:severityCategory', source: 'builtin', key: 'severityCategory' } as const;
const query: LogExploreQuery = {
  signal: 'logs',
  timeRange: 'last-30m',
  start: 1000,
  end: 2000,
  searchSyntax: 'structured-v1'
};
const values: LogFacetValuesResult = {
  state: 'ready',
  window: { start: 1000, end: 2000 },
  field,
  coverage: { mode: 'full_window' },
  matchedCount: 1,
  missingOrNullCount: 0,
  values: [{ value: 'old', count: 1 }],
  truncated: false
};
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
function fields() {
  vi.mocked(loadLogFacetFields).mockResolvedValue({
    state: 'ready',
    window: values.window,
    coverage: { mode: 'bounded_rows', rowLimit: 1000, scannedRows: 1, hasMore: false },
    fields: [field],
    truncated: false
  });
}
it('maps actual field/value candidates and never publishes a stale owner response', async () => {
  fields();
  let resolveOld: ((value: LogFacetValuesResult) => void) | undefined;
  let oldSignal: AbortSignal | undefined;
  vi.mocked(loadLogFacetValues)
    .mockImplementationOnce((_path, _window, _field, signal) => {
      oldSignal = signal;
      return new Promise(resolve => {
        resolveOld = resolve;
      });
    })
    .mockResolvedValue({ ...values, values: [{ value: 'new', count: 1 }] });
  const hook = renderHook(({ owner }) => useLogSearchSuggestions(owner, { kind: 'loading' }), {
    initialProps: { owner: query },
    wrapper: wrapper()
  });
  await waitFor(() => expect(hook.result.current.options[0]?.value).toBe('service'));
  act(() => hook.result.current.requestField('service'));
  await waitFor(() => expect(loadLogFacetValues).toHaveBeenCalledOnce());
  hook.rerender({ owner: { ...query, serviceName: 'new' } });
  await waitFor(() => expect(hook.result.current.options[0]?.value).toBe('new'));
  expect(hook.result.current.options[0]?.condition).toBe('service:"new"');
  expect(oldSignal?.aborted).toBe(true);
  await act(async () => {
    resolveOld?.(values);
    await Promise.resolve();
  });
  expect(hook.result.current.options[0]?.value).toBe('new');
});
it('loads values only for the first field matching a bare prefix and offers full conditions with fields', async () => {
  vi.mocked(loadLogFacetFields).mockResolvedValue({
    state: 'ready',
    window: values.window,
    coverage: { mode: 'bounded_rows', rowLimit: 1000, scannedRows: 1, hasMore: false },
    fields: [field, statusField],
    truncated: false
  });
  vi.mocked(loadLogFacetValues).mockResolvedValue({
    ...values,
    field: statusField,
    values: [
      { value: 'INFO', count: 3 },
      { value: 'ERROR', count: 1 }
    ]
  });
  const hook = renderHook(() => useLogSearchSuggestions(query, { kind: 'loading' }), { wrapper: wrapper() });
  await waitFor(() => expect(hook.result.current.options.map(option => option.value)).toContain('status'));
  act(() => hook.result.current.requestField(undefined, 'sta'));
  await waitFor(() => expect(hook.result.current.options.map(option => option.condition)).toContain('status:"INFO"'));
  expect(hook.result.current.options.map(option => option.value)).toContain('status');
  expect(hook.result.current.options.find(option => option.condition === 'status:"INFO"')).toMatchObject({
    condition: 'status:"INFO"',
    insertion: 'status:"INFO"',
    count: 3,
    fieldValue: true
  });
  expect(loadLogFacetValues).toHaveBeenCalledTimes(1);
  expect(loadLogFacetValues).toHaveBeenCalledWith(
    expect.any(String),
    { from: values.window.start, to: values.window.end },
    statusField.id,
    expect.any(AbortSignal)
  );
});
it('does not request catalogs for rejected expressions or Live mode', () => {
  const hook = renderHook(() => useLogSearchSuggestions(query, { kind: 'invalid_filter' }), { wrapper: wrapper() });
  expect(hook.result.current.state).toBe('unavailable');
  expect(loadLogFacetFields).not.toHaveBeenCalled();
  hook.unmount();
  renderHook(() => useLogSearchSuggestions({ ...query, live: true }, { kind: 'live' }), { wrapper: wrapper() });
  expect(loadLogFacetFields).not.toHaveBeenCalled();
});
