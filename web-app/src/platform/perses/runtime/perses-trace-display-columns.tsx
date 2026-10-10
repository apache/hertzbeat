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

import type { GridColDef } from '@mui/x-data-grid';
import type { TraceTableRow } from '@perses-dev/trace-table-plugin';
import type { TFunction } from 'i18next';
import type { HertzBeatTraceDisplay } from './perses-trace-display';
import { traceTableColumns } from './perses-trace-table-columns';
import { requireTraceRow, traceLookup, type TraceTableHost } from './perses-trace-table-model';

export function traceDisplayColumns(
  host: TraceTableHost,
  display: HertzBeatTraceDisplay,
  t: TFunction
): GridColDef<TraceTableRow>[] {
  const overrides = traceTableColumns(host, t);
  const rows = traceLookup(host.rows);
  const definitions: Record<HertzBeatTraceDisplay['columns'][number], GridColDef<TraceTableRow>> = {
    traceName: { field: 'name', ...overrides.name },
    spanCount: { field: 'spanCount', ...overrides.spanCount },
    duration: { field: 'durationMs', ...overrides.durationMs },
    startTime: { field: 'startTimeUnixMs', ...overrides.startTimeUnixMs },
    traceId: { field: 'traceId', minWidth: 220, flex: 2 },
    service: {
      field: 'service',
      minWidth: 140,
      flex: 1,
      valueGetter: (_, row) => {
        const item = requireTraceRow(rows, row);
        return item.rootState === 'unique' ? item.serviceName : item.representativeSpan.serviceName;
      }
    },
    errorCount: {
      field: 'errorCount',
      minWidth: 90,
      flex: 1,
      valueGetter: (_, row) => requireTraceRow(rows, row).errorSpanCount
    }
  };
  return display.columns.map(key => ({ ...definitions[key], headerName: t(`explore.traceColumns.fields.${key}`) }));
}
