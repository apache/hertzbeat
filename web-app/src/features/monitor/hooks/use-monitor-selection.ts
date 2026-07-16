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

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { Monitor } from '../api/monitor-api';
import { reconcileMonitorSelection, type MonitorScopedSelection } from '../model/monitor-model';

type MonitorSelectionSnapshot = {
  selection: MonitorScopedSelection;
  scope: string;
  visibleIds: readonly number[];
};

export function useMonitorSelection(scope: string, content?: Monitor[]) {
  const rows = useMemo(() => content ?? [], [content]);
  const visibleIds = useMemo(() => rows.map(row => row.id), [rows]);
  const [selection, setSelection] = useState<MonitorScopedSelection>({ scope, ids: [] });
  const latest = useRef<MonitorSelectionSnapshot>({ selection, scope, visibleIds });

  useLayoutEffect(() => {
    latest.current = { selection, scope, visibleIds };
  }, [selection, scope, visibleIds]);

  const selectedIds = reconcileMonitorSelection(selection, scope, visibleIds);

  useEffect(() => {
    // Render already fails closed. Persisting that invalidation prevents history or later rows from reviving old IDs.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelection(current => {
      const ids = reconcileMonitorSelection(current, scope, visibleIds);
      return current.scope === scope && ids === current.ids ? current : { scope, ids };
    });
  }, [scope, visibleIds]);

  const selectIds = useCallback((ids: number[]) => {
    setSelection({ scope, ids: reconcileMonitorSelection({ scope, ids }, scope, visibleIds) });
  }, [scope, visibleIds]);

  const clear = useCallback(() => {
    setSelection(current => current.ids.length === 0 ? current : { ...current, ids: [] });
  }, []);

  const validatedIds = useCallback(() => {
    const current = latest.current;
    return reconcileMonitorSelection(current.selection, current.scope, current.visibleIds);
  }, []);

  return { rows, selectedIds, selectIds, clear, validatedIds };
}
