/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { afterEach, expect, it, vi } from 'vitest';
import { apiMessagePostWithErrorEnvelope } from '@/core/http/api-message';
const transport = vi.hoisted(() => ({ fetch: vi.fn(), stream: vi.fn() }));
vi.mock('@/core/http/http-client', () => ({ apiFetch: transport.fetch }));
vi.mock('@/core/http/event-stream', () => ({ openBrowserEventStream: transport.stream }));
import { loadLogSignal, loadLogHistoryEvidence } from './explore-api';
import { loadLogFacetFields, loadLogFacetValues } from './explore-log-facets-api';
import { classifyExploreSignalError, logFilterFailureReason } from './explore-signal-api-model';
import { openLogStream } from './explore-log-stream';
afterEach(() => vi.resetAllMocks());
const query = { signal: 'logs', timeRange: 'last-30m', resourceFilter: 'region =' } as const;
function rejectFilter() {
  transport.fetch.mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify({ code: 1, msg: 'observability_log_filter_invalid', data: null }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    )
  );
}
it.each([
  ['list', () => loadLogSignal(query)],
  ['history', () => loadLogHistoryEvidence(query)],
  ['facet fields', () => loadLogFacetFields('/api/logs/facets/fields', { from: 1, to: 2 })],
  ['facet values', () => loadLogFacetValues('/api/logs/facets/values', { from: 1, to: 2 }, 'region')]
] as const)('preserves actual HTTP400 envelope through the %s adapter', async (_name, request) => {
  rejectFilter();
  const error: unknown = await request().catch((reason: unknown) => reason);
  expect(classifyExploreSignalError(error)).toBe('invalid_filter');
});
it('stops Live on an actual HTTP400 JSON response before opening EventSource', async () => {
  rejectFilter();
  const onInvalidFilter = vi.fn();
  const onUnavailable = vi.fn();
  openLogStream('/api/logs/sse/subscribe?resourceFilter=region%20%3D', {
    onInvalidFilter,
    onUnavailable,
    onOpen: vi.fn(),
    onLog: vi.fn(),
    onGap: vi.fn(),
    onRetrying: vi.fn(),
    onContractError: vi.fn()
  });
  await vi.waitFor(() => expect(onInvalidFilter).toHaveBeenCalledOnce());
  expect(onUnavailable).not.toHaveBeenCalled();
  expect(transport.stream).not.toHaveBeenCalled();
});

it('retains only recognized capability reasons from the real HTTP error envelope', async () => {
  for (const reason of [
    'full_text_unsupported',
    'cidr_unsupported',
    'nested_path_unsupported',
    'group_selection_unsupported',
    'SQL private'
  ]) {
    transport.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 1, msg: 'observability_log_filter_invalid', data: { reason } }), {
        status: 400
      })
    );
    const error = await loadLogSignal(query).catch((value: unknown) => value);
    expect(logFilterFailureReason(error)).toBe(reason === 'SQL private' ? undefined : reason);
  }
});

it.each(['calculated_budget_exceeded', 'calculated_invalid_pattern'] as const)(
  'classifies the real HTTP400 calculated %s envelope',
  async reason => {
    transport.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 1, msg: 'observability_log_filter_invalid', data: { reason } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    const error: unknown = await apiMessagePostWithErrorEnvelope('/api/logs/calculated/query', {}).catch(
      (value: unknown) => value
    );
    expect(classifyExploreSignalError(error)).toBe(reason);
  }
);

it.each(['cidr_unsupported', 'group_selection_unsupported'])(
  'passes %s through Live preflight without opening a stream',
  async reason => {
    transport.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 1, msg: 'observability_log_filter_invalid', data: { reason } }), {
        status: 400
      })
    );
    const onInvalidFilter = vi.fn();
    openLogStream('/api/logs/sse/subscribe?searchSyntax=structured-v1', {
      onInvalidFilter,
      onUnavailable: vi.fn(),
      onOpen: vi.fn(),
      onLog: vi.fn(),
      onGap: vi.fn(),
      onRetrying: vi.fn(),
      onContractError: vi.fn()
    });
    await vi.waitFor(() => expect(onInvalidFilter).toHaveBeenCalledWith(reason));
    expect(transport.stream).not.toHaveBeenCalled();
  }
);

it('applies the identical selector to list and both statistics requests', async () => {
  rejectFilter();
  const logGroupSelection = JSON.stringify({
    version: 1,
    groups: [{ field: 'attribute:status', kind: 'value', value: '2.0' }]
  });
  transport.fetch.mockResolvedValueOnce(
    new Response(
      JSON.stringify({ code: 0, msg: 'success', data: { content: [], totalElements: 0, pageIndex: 0, pageSize: 20 } }),
      { status: 200 }
    )
  );
  await loadLogHistoryEvidence({ ...query, logGroupSelection }).catch(() => undefined);
  expect(transport.fetch).toHaveBeenCalledTimes(3);
  for (const [path] of transport.fetch.mock.calls) {
    expect(new URLSearchParams(String(path).split('?')[1]).get('logGroupSelection')).toBe(logGroupSelection);
  }
});
