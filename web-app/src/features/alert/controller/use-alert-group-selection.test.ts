/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 * You may obtain a copy of the License at
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

import type { AlertGroupConverge, AlertGroupQuery } from '../model/alert-group-model';
import type { AlertGroupListState } from '../model/alert-group-state';
import { useAlertGroupSelection } from './use-alert-group-selection';

const query: AlertGroupQuery = { search: '', pageIndex: 0, pageSize: 8 };
const group = (id: number): AlertGroupConverge => ({
  id,
  name: `Policy ${id}`,
  groupLabels: ['service'],
  groupWait: 30,
  groupInterval: 300,
  repeatInterval: 3_600,
  enable: true
});
const ready = (ids: number[]): AlertGroupListState => ({
  kind: 'ready',
  records: ids.map(group),
  total: ids.length
});

describe('Alert Group selection', () => {
  it('keeps only unique visible ids and isolates them to the active query scope', () => {
    const view = renderHook(({ currentQuery, list }) => useAlertGroupSelection(currentQuery, list), {
      initialProps: { currentQuery: query, list: ready([7, 8]) }
    });

    act(() => view.result.current.selectIds([8, 7, 8, 99]));
    expect(view.result.current.selectedIds).toEqual([7, 8]);

    view.rerender({ currentQuery: { ...query, pageIndex: 1 }, list: ready([9]) });
    expect(view.result.current.selectedIds).toEqual([]);
    act(() => view.result.current.selectIds([9]));
    view.rerender({ currentQuery: query, list: ready([7, 8]) });
    expect(view.result.current.selectedIds).toEqual([]);
  });

  it('drops a selected row after the authoritative page no longer contains it', () => {
    const view = renderHook(({ list }) => useAlertGroupSelection(query, list), {
      initialProps: { list: ready([7, 8]) }
    });

    act(() => view.result.current.selectIds([7]));
    view.rerender({ list: ready([8]) });

    expect(view.result.current.selectedIds).toEqual([]);
    view.rerender({ list: ready([7, 8]) });
    expect(view.result.current.selectedIds).toEqual([]);
  });
});
