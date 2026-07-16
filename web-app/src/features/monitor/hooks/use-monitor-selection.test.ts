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

import { useMonitorSelection } from './use-monitor-selection';

describe('useMonitorSelection', () => {
  it('revalidates a previously captured action against the latest scope and rows', () => {
    const { result, rerender } = renderHook(
      ({ scope, rows }) => useMonitorSelection(scope, rows),
      { initialProps: { scope: 'checkout-page-1', rows: [monitor(7), monitor(8)] } }
    );

    act(() => result.current.selectIds([7]));
    const staleValidatedIds = result.current.validatedIds;
    expect(staleValidatedIds()).toEqual([7]);

    rerender({ scope: 'checkout-page-1', rows: [monitor(8)] });
    expect(staleValidatedIds()).toEqual([]);

    act(() => result.current.selectIds([8]));
    expect(staleValidatedIds()).toEqual([8]);

    rerender({ scope: 'orders-page-1', rows: [monitor(9)] });

    expect(staleValidatedIds()).toEqual([]);
  });
});

function monitor(id: number) {
  return { id, name: `monitor-${id}`, app: 'website', instance: `instance-${id}`, status: 1 };
}
