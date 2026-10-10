/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { LogRow } from '../model/explore-signal-contract';
import { inspectorAnalysisControls, useLogSelection } from './use-log-selection';
afterEach(cleanup);
it('keeps the selected simultaneous record through prepends and hides it on clear or authority change', () => {
  const first = { timeUnixNano: '1750000000000000000', body: 'first' } as LogRow;
  const second = { ...first, body: 'second' };
  const hook = renderHook(({ rows, identity }) => useLogSelection(rows, identity, true, 'newest'), {
    initialProps: { rows: [first, second], identity: 'workspace-one' }
  });
  act(() => hook.result.current.selectRow(1));
  expect(hook.result.current.selectedRow).toBe(second);
  hook.rerender({
    rows: [{ ...first, body: 'incoming', timeUnixNano: '1750000001000000000' }, first, second],
    identity: 'workspace-one'
  });
  expect(hook.result.current.selectedRow).toBe(second);
  expect(hook.result.current.selectedIndex).toBe(2);
  hook.rerender({ rows: [first, second], identity: 'workspace-two' });
  expect(hook.result.current.selectedRow).toBeUndefined();
  act(() => hook.result.current.selectRow(0));
  hook.rerender({ rows: [], identity: 'workspace-two' });
  expect(hook.result.current.selectedRow).toBeUndefined();
});
it('can close for an analysis handoff without stealing editor focus, while ordinary close restores the row', async () => {
  const row = { timeUnixNano: '1750000000000000000', body: 'selected' } as LogRow;
  const host = document.createElement('div');
  const trigger = document.createElement('button');
  trigger.dataset.logIndex = '0';
  host.append(trigger);
  const editor = document.createElement('input');
  document.body.append(host, editor);
  const hook = renderHook(() => useLogSelection([row], 'same', true, 'newest'));
  Object.defineProperty(hook.result.current.hostRef, 'current', { value: host });
  act(() => hook.result.current.selectRow(0));
  editor.focus();
  act(() => hook.result.current.closeInspector(false));
  await act(() => Promise.resolve());
  expect(hook.result.current.selectedRow).toBeUndefined();
  expect(document.activeElement).toBe(editor);
  act(() => hook.result.current.selectRow(0));
  act(() => hook.result.current.closeInspector());
  await act(() => Promise.resolve());
  expect(document.activeElement).toBe(trigger);
  host.remove();
  editor.remove();
});

it('closes only after an accepted current-evidence analysis action', () => {
  const close = vi.fn();
  const callback = vi.fn(() => false);
  const target = { field: { id: 'attribute:value', source: 'attribute' as const, key: 'value' }, numeric: true };
  const props = { evidenceCurrent: true, onAnalyzeLogField: callback };
  expect(inspectorAnalysisControls(props, close).onAnalyzeLogField?.(target, 'measure')).toBe(false);
  expect(close).not.toHaveBeenCalled();
  callback.mockReturnValue(true);
  expect(inspectorAnalysisControls(props, close).onAnalyzeLogField?.(target, 'measure')).toBe(true);
  expect(close).toHaveBeenCalledWith(false);
  callback.mockClear();
  expect(
    inspectorAnalysisControls({ ...props, evidenceCurrent: false }, close).onAnalyzeLogField?.(target, 'measure')
  ).toBe(false);
  expect(callback).not.toHaveBeenCalled();
});
