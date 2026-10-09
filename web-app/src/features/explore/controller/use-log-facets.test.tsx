/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { ApiMessageError } from '@/core/http/api-message';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { loadLogFacetFields, loadLogFacetValues } from '../api/explore-log-facets-api';
import type { LogExploreQuery } from '../model/explore-query';
import type { LogFacetValuesResult } from '../model/explore-log-facets';
import type { ExplorePageResultState } from '../model/explore-result-model';
import type { ExactTimeWindow } from '@/shared/query-context';
import { buildSignalApiPath } from '../api/explore-api';
import { useLogFacetCatalog } from './use-log-facets';
import { useLogFacetValues } from './use-log-facet-values';
vi.mock('../api/explore-log-facets-api', async original => ({
  ...(await original<typeof import('../api/explore-log-facets-api')>()),
  loadLogFacetFields: vi.fn(),
  loadLogFacetValues: vi.fn()
}));
const query: LogExploreQuery = { signal: 'logs', query: '', timeRange: 'last-30m', start: 100000, end: 200000 };
const values: LogFacetValuesResult = {
  state: 'ready',
  window: { start: 100000, end: 200000 },
  field: { id: 'builtin:severityCategory', source: 'builtin', key: 'severityCategory' },
  coverage: { mode: 'full_window' },
  matchedCount: 1,
  missingOrNullCount: 0,
  values: [{ value: 'ERROR', count: 1 }],
  truncated: false
};
function useFacetPair(
  scope: LogExploreQuery,
  result: ExplorePageResultState,
  available = true,
  source: 'a' | 'b' = 'a',
  window?: ExactTimeWindow,
  field = 'builtin:severityCategory'
) {
  const catalog = useLogFacetCatalog(scope, result, available, window);
  const section = useLogFacetValues(scope, result, field, available, source, window);
  return { ...catalog, ...section, selectedField: field };
}
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
it('loads only the shared field catalog when a consumer does not mount values', async () => {
  vi.mocked(loadLogFacetFields).mockResolvedValue({
    state: 'ready',
    window: values.window,
    coverage: { mode: 'bounded_rows', rowLimit: 1000, scannedRows: 1, hasMore: false },
    fields: [values.field],
    truncated: false
  });
  const hook = renderHook(() => useLogFacetCatalog(query, { kind: 'loading' }), { wrapper: wrapper() });
  await waitFor(() => expect(hook.result.current.fields.state).toBe('ready'));
  expect(loadLogFacetFields).toHaveBeenCalledTimes(1);
  expect(loadLogFacetValues).not.toHaveBeenCalled();
});
it('caches display and page changes but fetches a different committed scope', async () => {
  vi.mocked(loadLogFacetFields).mockResolvedValue({
    state: 'ready',
    window: values.window,
    coverage: { mode: 'bounded_rows', rowLimit: 1000, scannedRows: 1, hasMore: false },
    fields: [values.field],
    truncated: false
  });
  vi.mocked(loadLogFacetValues).mockResolvedValue(values);
  const hook = renderHook(({ value }) => useFacetPair(value, { kind: 'loading' }), {
    initialProps: { value: query },
    wrapper: wrapper()
  });
  await waitFor(() => expect(hook.result.current.values.state).toBe('ready'));
  hook.rerender({ value: { ...query, pageIndex: 4, logView: 'display' } });
  expect(loadLogFacetValues).toHaveBeenCalledTimes(1);
  hook.rerender({ value: { ...query, serviceName: 'checkout' } });
  await waitFor(() => expect(loadLogFacetValues).toHaveBeenCalledTimes(2));
  expect(vi.mocked(loadLogFacetValues).mock.calls[1]![0]).toContain('serviceName=checkout');
});
it('aborts old field requests and never presents their late counts', async () => {
  const requests: { signal: AbortSignal | undefined; resolve: (value: LogFacetValuesResult) => void }[] = [];
  vi.mocked(loadLogFacetFields).mockResolvedValue({
    state: 'unavailable',
    window: values.window,
    coverage: { mode: 'bounded_rows', rowLimit: 1000, scannedRows: null, hasMore: null },
    fields: [],
    truncated: false
  });
  vi.mocked(loadLogFacetValues).mockImplementation(
    (_p, _w, _f, signal) => new Promise(resolve => requests.push({ signal, resolve }))
  );
  const hook = renderHook(({ field }) => useFacetPair(query, { kind: 'loading' }, true, 'a', undefined, field), {
    initialProps: { field: 'builtin:severityCategory' },
    wrapper: wrapper()
  });
  await waitFor(() => expect(requests).toHaveLength(1));
  hook.rerender({ field: 'builtin:serviceName' });
  await waitFor(() => expect(requests).toHaveLength(2));
  expect(requests[0]!.signal?.aborted).toBe(true);
  act(() => requests[0]!.resolve(values));
  expect(hook.result.current.values).toEqual({ state: 'loading' });
  act(() =>
    requests[1]!.resolve({ ...values, field: { id: 'builtin:serviceName', source: 'builtin', key: 'serviceName' } })
  );
  await waitFor(() => expect(hook.result.current.values.data?.field.id).toBe('builtin:serviceName'));
});
it('does not issue facet queries for live or focused logs', () => {
  const hook = renderHook(({ value }) => useFacetPair(value, { kind: 'loading' }), {
    initialProps: { value: { ...query, live: true } },
    wrapper: wrapper()
  });
  hook.rerender({ value: { ...query, live: false, logRecordUid: 'record' } });
  expect(loadLogFacetValues).not.toHaveBeenCalled();
  expect(hook.result.current.fields.state).toBe('idle');
});
it('retains same-scope counts through retry and relative-window refresh failure', async () => {
  vi.mocked(loadLogFacetFields).mockResolvedValue({
    state: 'ready',
    window: values.window,
    coverage: { mode: 'bounded_rows', rowLimit: 1000, scannedRows: 1, hasMore: false },
    fields: [values.field],
    truncated: false
  });
  vi.mocked(loadLogFacetValues).mockResolvedValueOnce(values).mockRejectedValue(new Error('offline'));
  const evidence = {
    kind: 'ready' as const,
    signal: 'logs' as const,
    window: { from: 100000, to: 200000 },
    revision: 0,
    data: {} as never,
    statistics: {} as never
  };
  const relative = { ...query, start: undefined, end: undefined };
  const hook = renderHook(({ result }) => useFacetPair(relative, result), {
    initialProps: { result: evidence as import('../model/explore-result-model').ExplorePageResultState },
    wrapper: wrapper()
  });
  await waitFor(() => expect(hook.result.current.values.state).toBe('ready'));
  hook.rerender({ result: { kind: 'refreshing', evidence } });
  expect(hook.result.current.values.data).toEqual(values);
  await act(() => hook.result.current.onRetry());
  await waitFor(() => expect(hook.result.current.values.state).toBe('error'));
  expect(hook.result.current.values.data).toEqual(values);
  hook.rerender({ result: { kind: 'stale_error', errorKind: 'transport_error', evidence } });
  expect(hook.result.current.values.data).toEqual(values);
});

it('never resurfaces retained counts while retrying a permission denial', async () => {
  vi.mocked(loadLogFacetFields).mockResolvedValue({
    state: 'unavailable',
    window: values.window,
    coverage: { mode: 'bounded_rows', rowLimit: 1000, scannedRows: null, hasMore: null },
    fields: [],
    truncated: false
  });
  vi.mocked(loadLogFacetValues)
    .mockResolvedValueOnce(values)
    .mockRejectedValueOnce(new ApiMessageError('denied', { status: 403 }))
    .mockImplementation(() => new Promise(() => {}));
  const hook = renderHook(() => useFacetPair(query, { kind: 'loading' }), { wrapper: wrapper() });
  await waitFor(() => expect(hook.result.current.values.state).toBe('ready'));
  await act(() => hook.result.current.onRetry());
  await waitFor(() => expect(hook.result.current.values).toEqual({ state: 'permission' }));
  await act(() => hook.result.current.onRetry());
  await waitFor(() => expect(loadLogFacetValues).toHaveBeenCalledTimes(3));
  expect(hook.result.current.values.data).toBeUndefined();
});
it('hides catalog and values when the applied result loses permission', async () => {
  vi.mocked(loadLogFacetFields).mockResolvedValue({
    state: 'ready',
    window: values.window,
    coverage: { mode: 'bounded_rows', rowLimit: 1000, scannedRows: 1, hasMore: false },
    fields: [values.field],
    truncated: false
  });
  vi.mocked(loadLogFacetValues).mockResolvedValue(values);
  const evidence: ExplorePageResultState = {
    kind: 'ready',
    signal: 'logs',
    window: { from: 100000, to: 200000 },
    revision: 1,
    data: {} as never,
    statistics: {} as never
  };
  const hook = renderHook(({ result }) => useFacetPair(query, result), {
    initialProps: { result: evidence as ExplorePageResultState },
    wrapper: wrapper()
  });
  await waitFor(() => expect(hook.result.current.values.state).toBe('ready'));
  hook.rerender({ result: { kind: 'stale_error', errorKind: 'permission', evidence } });
  expect(hook.result.current.fields).toEqual({ state: 'permission' });
  expect(hook.result.current.values).toEqual({ state: 'permission' });
  hook.rerender({ result: { kind: 'permission' } });
  expect(hook.result.current.fields).toEqual({ state: 'permission' });
  expect(hook.result.current.values).toEqual({ state: 'permission' });
});
it('reports unavailable facets for rejected filters without querying or dropping the chosen field', () => {
  const hook = renderHook(() => useFacetPair(query, { kind: 'invalid_filter' }), { wrapper: wrapper() });
  expect(hook.result.current.fields).toEqual({ state: 'unavailable' });
  expect(hook.result.current.values).toEqual({ state: 'unavailable' });
  expect(hook.result.current.selectedField).toBe('builtin:severityCategory');
  expect(loadLogFacetFields).not.toHaveBeenCalled();
  expect(loadLogFacetValues).not.toHaveBeenCalled();
});
it.each(['calculated_invalid_pattern', 'calculated_budget_exceeded'] as const)(
  'blocks catalog and values on the applied %s failure without retaining prior fields',
  kind => {
    const hook = renderHook(() => useFacetPair(query, { kind }), { wrapper: wrapper() });
    expect(hook.result.current.fields).toEqual({ state: kind });
    expect(hook.result.current.values).toEqual({ state: kind });
    expect(loadLogFacetFields).not.toHaveBeenCalled();
    expect(loadLogFacetValues).not.toHaveBeenCalled();
  }
);
it('drops cached facet data when a refresh fails with a calculated pattern error', async () => {
  vi.mocked(loadLogFacetFields).mockResolvedValue({
    state: 'ready',
    window: values.window,
    coverage: { mode: 'bounded_rows', rowLimit: 1000, scannedRows: 1, hasMore: false },
    fields: [values.field],
    truncated: false
  });
  vi.mocked(loadLogFacetValues).mockResolvedValue(values);
  const evidence: ExplorePageResultState = {
    kind: 'ready',
    signal: 'logs',
    window: { from: 100000, to: 200000 },
    revision: 1,
    data: {} as never,
    statistics: {} as never
  };
  const hook = renderHook(({ result }) => useFacetPair(query, result), {
    initialProps: { result: evidence as ExplorePageResultState },
    wrapper: wrapper()
  });
  await waitFor(() => expect(hook.result.current.fields.state).toBe('ready'));
  hook.rerender({ result: { kind: 'stale_error', errorKind: 'calculated_invalid_pattern', evidence } });
  expect(hook.result.current.fields).toEqual({ state: 'calculated_invalid_pattern' });
  expect(hook.result.current.values).toEqual({ state: 'calculated_invalid_pattern' });
});
it('sends both facet reads to explicit b time and aborts both when applied time changes', async () => {
  let fieldsSignal: AbortSignal | undefined, valuesSignal: AbortSignal | undefined;
  vi.mocked(loadLogFacetFields)
    .mockImplementationOnce((_path, _window, signal) => {
      fieldsSignal = signal;
      return new Promise(() => {});
    })
    .mockResolvedValue({
      state: 'ready',
      window: values.window,
      coverage: { mode: 'bounded_rows', rowLimit: 1000, scannedRows: 0, hasMore: false },
      fields: [],
      truncated: false
    });
  vi.mocked(loadLogFacetValues)
    .mockImplementationOnce((_path, _window, _field, signal) => {
      valuesSignal = signal;
      return new Promise(() => {});
    })
    .mockResolvedValue(values);
  const hook = renderHook(
    ({ start }) => useFacetPair({ ...query, query: 'source-b', start, end: start + 1000 }, { kind: 'loading' }),
    { initialProps: { start: 996400000 }, wrapper: wrapper() }
  );
  await waitFor(() => expect(loadLogFacetValues).toHaveBeenCalledTimes(1));
  expect(vi.mocked(loadLogFacetFields).mock.calls[0]?.[1]).toEqual({ from: 996400000, to: 996401000 });
  expect(vi.mocked(loadLogFacetValues).mock.calls[0]?.[1]).toEqual({ from: 996400000, to: 996401000 });
  hook.rerender({ start: 913600000 });
  await waitFor(() => expect(loadLogFacetValues).toHaveBeenCalledTimes(2));
  expect(fieldsSignal?.aborted).toBe(true);
  expect(valuesSignal?.aborted).toBe(true);
});

it('debounces lookup, immediately disables old values and resets even for identical a/b scope', async () => {
  vi.mocked(loadLogFacetValues).mockResolvedValue(values);
  const hook = renderHook(({ source }) => useFacetPair(query, { kind: 'loading' }, true, source), {
    initialProps: { source: 'a' as 'a' | 'b' },
    wrapper: wrapper()
  });
  await waitFor(() => expect(hook.result.current.values.state).toBe('ready'));
  act(() => hook.result.current.onValueSearchChange('Rare'));
  expect(hook.result.current.values.state).not.toBe('ready');
  expect(loadLogFacetValues).toHaveBeenCalledTimes(1);
  act(() => hook.result.current.onValueSearchChange('Rare%'));
  await waitFor(() => expect(loadLogFacetValues).toHaveBeenCalledTimes(2));
  expect(vi.mocked(loadLogFacetValues).mock.calls[1]?.[4]).toBe('Rare%');
  hook.rerender({ source: 'b' });
  expect(hook.result.current.valueSearch).toBe('');
  hook.rerender({ source: 'a' });
  expect(hook.result.current.valueSearch).toBe('');
});

it('aborts a superseded lookup and never lets its late error replace the new result', async () => {
  const requests: {
    search: string | undefined;
    signal: AbortSignal | undefined;
    resolve: (value: LogFacetValuesResult) => void;
    reject: (reason: Error) => void;
  }[] = [];
  vi.mocked(loadLogFacetValues).mockImplementation(
    (_p, _w, _f, signal, search) => new Promise((resolve, reject) => requests.push({ search, signal, resolve, reject }))
  );
  const hook = renderHook(({ scope }) => useFacetPair(scope, { kind: 'loading' }), {
    initialProps: { scope: query },
    wrapper: wrapper()
  });
  await waitFor(() => expect(requests).toHaveLength(1));
  act(() => requests[0]!.resolve(values));
  await waitFor(() => expect(hook.result.current.values.state).toBe('ready'));
  act(() => hook.result.current.onValueSearchChange('first'));
  await waitFor(() => expect(requests).toHaveLength(2));
  act(() => hook.result.current.onValueSearchChange('Rare'));
  expect(requests[1]!.signal?.aborted).toBe(true);
  expect(hook.result.current.values.state).toBe('loading');
  await waitFor(() => expect(requests).toHaveLength(3));
  const fresh = { ...values, search: { query: 'Rare', matchedCount: 1 }, values: [{ value: 'Rare', count: 1 }] };
  act(() => requests[2]!.resolve(fresh));
  await waitFor(() => expect(hook.result.current.values.data).toEqual(fresh));
  act(() => requests[1]!.reject(new Error('old lookup failed')));
  expect(hook.result.current.values.state).toBe('ready');
  hook.rerender({ scope: { ...query, serviceName: 'changed' } });
  expect(hook.result.current.valueSearch).toBe('');
  expect(hook.result.current.values.data).toBeUndefined();
});

function deferredFacet<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function fieldsFor(window = values.window) {
  return {
    state: 'ready' as const,
    window,
    coverage: { mode: 'bounded_rows' as const, rowLimit: 1000 as const, scannedRows: 1, hasMore: false },
    fields: [values.field],
    truncated: false
  };
}
it.each([
  ['query', { query: 'new-search' }],
  ['service', { serviceName: 'payments', serviceNamespace: 'commerce', environment: 'prod' }],
  ['window', { start: 300000, end: 400000 }]
] as const)(
  'binds log catalog and counts to the committed %s and rejects obsolete success/error',
  async (_name, patch) => {
    const oldFields = deferredFacet<ReturnType<typeof fieldsFor>>();
    const oldValues = deferredFacet<LogFacetValuesResult>();
    vi.mocked(loadLogFacetFields).mockReturnValueOnce(oldFields.promise);
    vi.mocked(loadLogFacetValues).mockReturnValueOnce(oldValues.promise);
    const next = { ...query, ...patch };
    const expectedWindow = { start: next.start!, end: next.end! };
    const currentValues: LogFacetValuesResult = {
      ...values,
      window: expectedWindow,
      matchedCount: 17,
      missingOrNullCount: 2,
      values: [{ value: 'WARN', count: 15 }]
    };
    vi.mocked(loadLogFacetFields).mockResolvedValue(fieldsFor(expectedWindow));
    vi.mocked(loadLogFacetValues).mockResolvedValue(currentValues);
    const hook = renderHook(({ scope }) => useFacetPair(scope, { kind: 'loading' }), {
      initialProps: { scope: query },
      wrapper: wrapper()
    });
    await waitFor(() => expect(loadLogFacetValues).toHaveBeenCalledOnce());
    const fieldsSignal = vi.mocked(loadLogFacetFields).mock.calls[0]![2]!;
    const valuesSignal = vi.mocked(loadLogFacetValues).mock.calls[0]![3]!;
    hook.rerender({ scope: next });
    expect(hook.result.current.fields.data).toBeUndefined();
    expect(hook.result.current.values.data).toBeUndefined();
    await waitFor(() => expect(hook.result.current.fields.state).toBe('ready'));
    await waitFor(() => expect(hook.result.current.values.state).toBe('ready'));
    expect(fieldsSignal.aborted).toBe(true);
    expect(valuesSignal.aborted).toBe(true);
    const main = new URL(buildSignalApiPath(next), 'http://fixture').searchParams;
    for (const path of [
      vi.mocked(loadLogFacetFields).mock.calls[1]![0],
      vi.mocked(loadLogFacetValues).mock.calls[1]![0]
    ]) {
      const params = new URL(path, 'http://fixture').searchParams;
      for (const key of ['search', 'serviceName', 'serviceNamespace', 'environment', 'start', 'end'])
        expect(params.get(key)).toBe(main.get(key));
    }
    await act(async () => {
      oldFields.reject(new Error('obsolete catalog failed'));
      await oldFields.promise.catch(() => undefined);
      oldValues.resolve(values);
      await oldValues.promise;
    });
    expect(hook.result.current.fields).toMatchObject({ state: 'ready', data: { window: expectedWindow } });
    expect(hook.result.current.values).toMatchObject({ state: 'ready', data: currentValues });
  }
);
it('recovers independent failed log catalog/count retries without duplicate requests or stuck loading', async () => {
  const fields = deferredFacet<ReturnType<typeof fieldsFor>>();
  const counts = deferredFacet<LogFacetValuesResult>();
  vi.mocked(loadLogFacetFields).mockRejectedValueOnce(new Error('catalog offline')).mockReturnValueOnce(fields.promise);
  vi.mocked(loadLogFacetValues).mockRejectedValueOnce(new Error('counts offline')).mockReturnValueOnce(counts.promise);
  const hook = renderHook(() => useFacetPair(query, { kind: 'loading' }), { wrapper: wrapper() });
  await waitFor(() => expect(hook.result.current.fields.state).toBe('error'));
  await waitFor(() => expect(hook.result.current.values.state).toBe('error'));
  act(() => {
    hook.result.current.onCatalogRetry();
    hook.result.current.onCatalogRetry();
    hook.result.current.onRetry();
    hook.result.current.onRetry();
  });
  await waitFor(() => expect(hook.result.current.fields.state).toBe('loading'));
  await waitFor(() => expect(hook.result.current.values.state).toBe('loading'));
  expect(loadLogFacetFields).toHaveBeenCalledTimes(2);
  expect(loadLogFacetValues).toHaveBeenCalledTimes(2);
  await act(async () => {
    counts.resolve(values);
    await counts.promise;
  });
  await waitFor(() => expect(hook.result.current.values.state).toBe('ready'));
  expect(hook.result.current.fields.state).toBe('loading');
  await act(async () => {
    fields.resolve(fieldsFor());
    await fields.promise;
  });
  await waitFor(() => expect(hook.result.current.fields.state).toBe('ready'));
});
