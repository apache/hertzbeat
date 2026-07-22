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

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InstrumentationContractError, InstrumentationRequestError } from '../api/instrumentation-api';
import { useInstrumentationContractRefresh } from './use-instrumentation-contract-refresh';

describe('instrumentation contract refresh controller', () => {
  it.each(['instrumentation_schema_unsupported', 'instrumentation_selection_invalid'] as const)(
    'clears stale state and refreshes catalog for %s',
    async machineCode => {
      const clearSelection = vi.fn();
      const clearGuide = vi.fn();
      const resetFlow = vi.fn();
      const refreshCatalog = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useInstrumentationContractRefresh({
          clearSelection,
          clearGuide,
          resetFlow,
          refreshCatalog
        })
      );

      await expect(result.current(new InstrumentationRequestError(machineCode))).resolves.toBe(true);

      expect(clearSelection).toHaveBeenCalledOnce();
      expect(clearGuide).toHaveBeenCalledOnce();
      expect(resetFlow).toHaveBeenCalledOnce();
      expect(refreshCatalog).toHaveBeenCalledOnce();
    }
  );

  it('does not refresh catalog for context errors', async () => {
    const actions = { clearSelection: vi.fn(), clearGuide: vi.fn(), resetFlow: vi.fn(), refreshCatalog: vi.fn() };
    const { result } = renderHook(() => useInstrumentationContractRefresh(actions));

    await expect(result.current(new InstrumentationRequestError('instrumentation_context_invalid'))).resolves.toBe(
      false
    );
    expect(actions.refreshCatalog).not.toHaveBeenCalled();
    expect(actions.clearSelection).not.toHaveBeenCalled();
    expect(actions.clearGuide).not.toHaveBeenCalled();
    expect(actions.resetFlow).not.toHaveBeenCalled();
  });

  it('clears stale state when a successful response violates the frozen contract', async () => {
    const actions = {
      clearSelection: vi.fn(),
      clearGuide: vi.fn(),
      resetFlow: vi.fn(),
      refreshCatalog: vi.fn()
    };
    const { result } = renderHook(() => useInstrumentationContractRefresh(actions));

    await expect(result.current(new InstrumentationContractError('selection mismatch'))).resolves.toBe(true);

    expect(actions.clearSelection).toHaveBeenCalledOnce();
    expect(actions.clearGuide).toHaveBeenCalledOnce();
    expect(actions.resetFlow).toHaveBeenCalledOnce();
    expect(actions.refreshCatalog).toHaveBeenCalledOnce();
  });
});
