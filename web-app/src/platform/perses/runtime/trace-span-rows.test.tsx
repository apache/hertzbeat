/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TraceSpanRows } from './trace-span-rows';
import type { TraceSpanRow } from '../datasource/hertzbeat-trace-analytics-schema';
afterEach(cleanup);
const row: TraceSpanRow = {
  traceId: '0123456789abcdef0123456789abcdef',
  spanId: '0123456789abcdef',
  parentSpanId: null,
  serviceName: 'checkout',
  serviceNamespace: null,
  environment: null,
  operationName: 'GET /checkout',
  spanKind: 'SERVER',
  status: 'UNSET',
  startTimeUnixNano: '1750000000123456789',
  durationNanos: '100'
};
const data = { content: [row], totalElements: 1, pageIndex: 0, pageSize: 10, sort: 'newest' as const };
const display = { columns: ['traceName' as const], density: 'compact' as const };
it('renders operation text without a misleading disabled action when selection is unsupported', () => {
  render(<TraceSpanRows data={data} display={display} enabled />);
  expect(screen.getByText(row.operationName!)).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
it('preserves supported selection and its stale-evidence disabled boundary', () => {
  const onOpen = vi.fn();
  const view = render(<TraceSpanRows data={data} display={display} enabled onOpen={onOpen} />);
  fireEvent.click(screen.getByRole('button', { name: row.operationName! }));
  expect(onOpen).toHaveBeenCalledExactlyOnceWith(row);
  view.rerender(<TraceSpanRows data={data} display={display} enabled={false} onOpen={onOpen} />);
  expect(screen.getByRole('button', { name: row.operationName! })).toBeDisabled();
});
it.each([
  ['182416041', '182.42 ms'],
  ['1280000000', '1.28 s'],
  ['1234', '1.23 μs'],
  ['1', '1 ns'],
  ['999', '999 ns'],
  ['0', '0 ns'],
  [null, '—']
])('formats duration %s compactly without losing exact evidence', (durationNanos, label) => {
  render(
    <TraceSpanRows
      data={{ ...data, content: [{ ...row, durationNanos }] }}
      display={{ ...display, columns: ['duration'] }}
      enabled
    />
  );
  const value = screen.getByText(label);
  if (durationNanos === null) expect(value).not.toHaveAttribute('title');
  else expect(value).toHaveAttribute('title', `${durationNanos} ns`);
});
