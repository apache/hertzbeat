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

import { useCallback, useEffect, useRef } from 'react';
import { buildExplorePath, type LogExploreQuery } from '../model/explore-model';
import type { LogRow } from '../model/explore-signal-contract';
import type { ExactTimeWindow } from '@/shared/query-context';
import type { SelectionProps } from './explore-log-table-selection-contract';

export function usePagedLogSelection({
  rows,
  page,
  query,
  timeWindow,
  evidenceCurrent,
  selectRow,
  openPath
}: {
  rows: LogRow[];
  page: SelectionProps['page'];
  query: LogExploreQuery;
  timeWindow: ExactTimeWindow;
  evidenceCurrent: boolean;
  selectRow: (index: number) => void;
  openPath: (path: string) => void;
}) {
  const scope = `${buildExplorePath({ ...query, pageIndex: undefined })}:${timeWindow.from}:${timeWindow.to}`;
  const pending = useRef<{ pageIndex: number; rowIndex: number; scope: string } | undefined>(undefined);
  useEffect(() => {
    if (pending.current?.scope !== scope) pending.current = undefined;
  }, [scope]);
  const pageNumber = page?.number;
  useEffect(() => {
    const target = pending.current;
    if (
      !target ||
      target.scope !== scope ||
      !page ||
      !evidenceCurrent ||
      pageNumber !== target.pageIndex ||
      rows.length === 0
    )
      return;
    selectRow(Math.min(target.rowIndex, rows.length - 1));
    pending.current = undefined;
  }, [evidenceCurrent, page, pageNumber, rows, scope, selectRow]);
  const selectOrNavigate = useCallback(
    (index: number) => {
      if (!evidenceCurrent) return;
      if (index >= 0 && index < rows.length) {
        pending.current = undefined;
        selectRow(index);
        return;
      }
      if (!page || pending.current?.scope === scope) return;
      const nextPage = page.number + (index < 0 ? -1 : 1);
      if (nextPage < 0 || nextPage >= page.totalPages) return;
      pending.current = { pageIndex: nextPage, rowIndex: index < 0 ? page.size - 1 : 0, scope };
      openPath(buildExplorePath({ ...query, pageIndex: nextPage || undefined }));
    },
    [evidenceCurrent, openPath, page, query, rows.length, scope, selectRow]
  );
  const cancelPendingNavigation = useCallback(() => {
    pending.current = undefined;
  }, []);
  return { selectOrNavigate, cancelPendingNavigation };
}
