/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import { HertzBeatLogsTableResult } from '@/platform/perses';
import { PersesSignalRuntime } from '@/platform/perses/runtime/perses-signal-runtime';
import { createExploreLogPersesResult } from './explore-perses-result-model';
import { explorePersesMessages } from '../components/explore-perses-messages';
import type { LogRow } from './explore-signal-contract';
vi.mock('@/platform/perses/runtime/perses-signal-runtime', () => ({ PersesSignalRuntime: vi.fn(() => null) }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const window = { from: 1750000000000, to: 1750000060000 };
const descriptor = { version: 1, field: 'attribute:duration', type: 'number', direction: 'desc' } as const;
const rows: LogRow[] = [2, 30, 10].map((seconds, index) => ({
  logRecordUid: `log-${index}`,
  timeUnixNano: String(BigInt(window.from + seconds * 1000) * 1000000n),
  observedTimeUnixNano: null,
  severityNumber: 17,
  severityText: 'ERROR',
  body: `rank-${index}`,
  attributes: { duration: 100 - index },
  droppedAttributesCount: 0,
  traceId: null,
  spanId: null,
  traceFlags: null,
  resource: {},
  resourceSchemaUrl: null,
  instrumentationScope: null,
  scopeSchemaUrl: null
}));
const page = { content: rows, number: 0, size: 20, totalElements: 3, totalPages: 1 };
it('preserves server field ordering through the actual Explore adapter and primitive conversion', async () => {
  const result = createExploreLogPersesResult(
    { signal: 'logs', timeRange: 'last-30m', logSort: JSON.stringify(descriptor) },
    page,
    window,
    1
  );
  expect(result.query.logSort).toEqual(descriptor);
  render(
    <HertzBeatLogsTableResult
      {...result}
      title="Logs"
      ariaLabel="Logs"
      messages={explorePersesMessages(((key: string) => key) as TFunction)}
    />
  );
  await waitFor(() => expect(PersesSignalRuntime).toHaveBeenCalled());
  const props = vi.mocked(PersesSignalRuntime).mock.lastCall![0];
  expect(props.kind).toBe('logs-table');
  if (props.kind !== 'logs-table') throw new Error('Expected log runtime');
  expect(props.data).toMatchObject({ preserveOrder: true });
  expect(props.data.entries?.map(entry => entry.line)).toEqual(['rank-0', 'rank-1', 'rank-2']);
  expect(props.data.entries?.map(entry => entry.timestamp)).toEqual([1750000002, 1750000030, 1750000010]);
});
it.each([{ logSort: '{}' }, { logSort: JSON.stringify(descriptor), sort: 'oldest' }])(
  'rejects malformed or conflicting ordering at the adapter boundary',
  order => {
    expect(() =>
      createExploreLogPersesResult({ signal: 'logs', timeRange: 'last-30m', ...order }, page, window, 1)
    ).toThrow();
  }
);
