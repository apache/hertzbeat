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

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { MonitorListRow } from '../model/monitor-list-snapshot';
import { useMonitorSelection } from './use-monitor-selection';

describe('useMonitorSelection', () => {
  it('preserves selected ids across pages but clears them when the filter scope changes', () => {
    const { result, rerender } = renderHook(({ scope, page, rows }) => useMonitorSelection(scope, page, rows), {
      initialProps: { scope: 'checkout', page: 'checkout-page-1', rows: [monitor(7), monitor(8)] }
    });

    act(() => result.current.selectIds([7]));
    const staleValidatedIds = result.current.validatedIds;
    expect(staleValidatedIds()).toEqual([7]);

    rerender({ scope: 'checkout', page: 'checkout-page-2', rows: [monitor(9)] });
    expect(staleValidatedIds()).toEqual([7]);

    act(() => result.current.selectIds([7, 9]));
    expect(staleValidatedIds()).toEqual([7, 9]);

    rerender({ scope: 'orders', page: 'orders-page-1', rows: [monitor(10)] });

    expect(staleValidatedIds()).toEqual([]);
  });

  it('does not revive a selected id after a same-page refresh removes it', () => {
    const { result, rerender } = renderHook(({ rows }) => useMonitorSelection('checkout', 'checkout-page-1', rows), {
      initialProps: { rows: [monitor(7), monitor(8)] }
    });

    act(() => result.current.selectIds([7]));
    rerender({ rows: [monitor(8)] });
    expect(result.current.selectedIds).toEqual([]);

    rerender({ rows: [monitor(7), monitor(8)] });
    expect(result.current.selectedIds).toEqual([]);
  });

  it('keeps a disappeared selection reversible but excludes it from every command target', () => {
    const { result, rerender } = renderHook(({ rows }) => useMonitorSelection('checkout', 'page-1', rows), {
      initialProps: { rows: [monitor(7), monitor(8)] }
    });
    act(() => result.current.selectIds([7, 8]));

    rerender({ rows: [monitor(7), { ...monitor(8), displayState: 'disappeared' }] });

    expect(result.current.selectedIds).toEqual([7]);
    expect(result.current.validatedIds()).toEqual([7]);

    rerender({ rows: [monitor(7), { ...monitor(8), displayState: 'active' }] });
    expect(result.current.selectedIds).toEqual([7, 8]);
  });
});

function monitor(id: number): MonitorListRow {
  return { id, name: `monitor-${id}`, app: 'website', instance: `instance-${id}`, status: 1 };
}
