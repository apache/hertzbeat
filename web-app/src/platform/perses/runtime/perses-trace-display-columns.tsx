/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
