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

import type { TraceTableColumnOverrides, TraceTableRow } from '@perses-dev/trace-table-plugin';
import type { TFunction } from 'i18next';

import {
  nullLastTraceDuration,
  requireTraceRow,
  traceDuration,
  traceLookup,
  traceName,
  type TraceTableHost
} from './perses-trace-table-model';
import { TraceNameCell, TraceCounts } from './perses-trace-table-cells';

export function traceTableColumns(host: TraceTableHost, t: TFunction): TraceTableColumnOverrides {
  const rows = traceLookup(host.rows);
  const evidence = (row: TraceTableRow) => requireTraceRow(rows, row);
  return {
    name: {
      headerName: t('explore.perses.traceTable.trace'),
      minWidth: 180,
      flex: 4,
      valueGetter: (_, row) => traceName(evidence(row), t),
      renderCell: params => <TraceNameCell row={evidence(params.row)} host={host} focused={params.hasFocus} t={t} />
    },
    spanCount: {
      headerName: t('explore.perses.traceTable.spans'),
      minWidth: 76,
      flex: 1,
      valueGetter: (_, row) => evidence(row).spanCount,
      renderCell: params => <TraceCounts row={evidence(params.row)} t={t} />
    },
    durationMs: {
      headerName: t('explore.perses.traceTable.rootDuration'),
      minWidth: 100,
      flex: 1,
      getSortComparator: nullLastTraceDuration,
      valueFormatter: value => traceDuration(value),
      renderCell: params => (
        <span aria-label={params.row.durationMs == null ? t('explore.perses.traceTable.noRootDuration') : undefined}>
          {traceDuration(params.row.durationMs)}
        </span>
      )
    },
    startTimeUnixMs: {
      headerName: t('explore.perses.traceTable.observedStart'),
      minWidth: 160,
      flex: 2,
      valueGetter: (_, row) => evidence(row).observedStartTime,
      valueFormatter: value => new Date(Number(value)).toISOString(),
      renderCell: params => (
        <time
          dateTime={new Date(evidence(params.row).observedStartTime).toISOString()}
          title={new Date(evidence(params.row).observedStartTime).toISOString()}
        >
          {new Date(evidence(params.row).observedStartTime).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
          })}
        </time>
      )
    }
  };
}
