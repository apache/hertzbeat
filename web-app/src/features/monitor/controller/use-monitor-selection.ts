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

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { Monitor } from '../model/monitor-contract';
import { reconcileMonitorSelection, type MonitorScopedSelection } from '../model/monitor-model';
import { isMonitorRowDisappeared, type MonitorListRow } from '../model/monitor-list-snapshot';

type MonitorSelectionSnapshot = {
  selection: MonitorScopedSelection;
  scope: string;
  page: string;
  visibleIds: readonly number[];
  disabledIds: readonly number[];
};

export type MonitorSelectionController = {
  rows: Monitor[];
  selectedIds: number[];
  selectIds: (ids: number[]) => void;
  remove: (ids: readonly number[]) => void;
  validatedIds: () => number[];
};

export function useMonitorSelection(
  scope: string,
  page: string,
  content?: MonitorListRow[]
): MonitorSelectionController {
  const rows = useMemo(() => content ?? [], [content]);
  const visibleIds = useMemo(() => rows.map(row => row.id), [rows]);
  const disabledIds = useMemo(() => rows.filter(isMonitorRowDisappeared).map(row => row.id), [rows]);
  const [selection, setSelection] = useState<MonitorScopedSelection>({ scope, ids: [] });
  const latest = useRef<MonitorSelectionSnapshot>({ selection, scope, page, visibleIds, disabledIds });
  const selectedIds = actionableSelection(selection, scope, visibleIds, disabledIds);

  useLayoutEffect(() => {
    const previous = latest.current;
    const next = reconcileSelectionAfterRead(selection, previous, scope, page, visibleIds);
    setSelection(next);
    latest.current = {
      selection: next,
      scope,
      page,
      visibleIds,
      disabledIds
    };
  }, [disabledIds, page, scope, selection, visibleIds]);

  const selectIds = useCallback(
    (ids: number[]) => {
      const next = { scope, ids: reconcileMonitorSelection({ scope, ids }, scope) };
      setSelection({ scope, ids: actionableSelection(next, scope, visibleIds, disabledIds) });
    },
    [disabledIds, scope, visibleIds]
  );

  const remove = useCallback((ids: readonly number[]) => {
    const removed = new Set(ids);
    setSelection(current => {
      const remaining = current.ids.filter(id => !removed.has(id));
      return remaining.length === current.ids.length ? current : { ...current, ids: remaining };
    });
  }, []);

  const validatedIds = useCallback(() => {
    const current = latest.current;
    if (current.scope !== scope || current.page !== page) return [];
    return actionableSelection(current.selection, scope, current.visibleIds, current.disabledIds);
  }, [page, scope]);

  return { rows, selectedIds, selectIds, remove, validatedIds };
}

function actionableSelection(
  selection: MonitorScopedSelection,
  scope: string,
  visibleIds: readonly number[],
  disabledIds: readonly number[]
) {
  const visible = new Set(visibleIds);
  const disabled = new Set(disabledIds);
  return reconcileMonitorSelection(selection, scope).filter(id => visible.has(id) && !disabled.has(id));
}

function reconcileSelectionAfterRead(
  selection: MonitorScopedSelection,
  previous: MonitorSelectionSnapshot,
  scope: string,
  page: string,
  visibleIds: readonly number[]
) {
  const selectedIds = reconcileMonitorSelection(selection, scope);
  if (selection.scope !== scope) return { scope, ids: [] };
  if (previous.scope !== scope || previous.page !== page) return { scope, ids: [] };
  // A same-page reread is authoritative for rows that were previously visible.
  const visible = new Set(visibleIds);
  const removed = new Set(previous.visibleIds.filter(id => !visible.has(id)));
  const retained = selectedIds.filter(id => !removed.has(id));
  return retained.length === selection.ids.length ? selection : { scope, ids: retained };
}
