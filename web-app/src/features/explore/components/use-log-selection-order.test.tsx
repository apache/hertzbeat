/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { useLogSelection } from './use-log-selection';
import type { LogRow } from '../model/explore-signal-contract';
it('inspects the actual server ordered row without timestamp resorting', () => {
  const rows = [
    { timeUnixNano: '1000000000', body: 'largest' },
    { timeUnixNano: '3000000000', body: 'smaller' }
  ] as LogRow[];
  const { result } = renderHook(() => useLogSelection(rows, 'field-order', true, 'preserve'));
  expect(result.current.orderedRows).toBe(rows);
  act(() => result.current.selectRow(0));
  expect(result.current.selectedRow).toBe(rows[0]);
});
