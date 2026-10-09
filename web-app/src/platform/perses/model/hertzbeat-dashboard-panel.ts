import { validLogColumns, type LogColumn } from './log-column';
import { validTraceColumns, type HertzBeatTraceColumn } from '../runtime/perses-trace-display';
/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';
import { metricViewSchema } from '../metrics/metric-view';

import { dashboardQuerySchema } from './hertzbeat-dashboard-query';
import { dashboardPlainTextSchema } from './hertzbeat-dashboard-text';

export const dashboardDisplaySchema = z
  .object({
    name: dashboardPlainTextSchema
      .min(1)
      .max(255)
      .refine(value => value.trim().length > 0 && value.trim() === value),
    description: dashboardPlainTextSchema.max(512).optional()
  })
  .strict();
const emptyOptions = z.object({}).strict();
const scalarOptions = z
  .object({ calculation: z.literal('last-number'), format: z.object({ unit: z.literal('decimal') }).strict() })
  .strict();
const panelPluginSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('TimeSeriesChart'),
      spec: z
        .object({
          metricView: metricViewSchema.optional(),
          visual: z
            .object({ display: z.enum(['line', 'bar']) })
            .strict()
            .optional()
        })
        .strict()
    })
    .strict(),
  z.object({ kind: z.literal('StatChart'), spec: scalarOptions }).strict(),
  z
    .object({ kind: z.literal('GaugeChart'), spec: scalarOptions.extend({ max: z.number().positive().finite() }) })
    .strict(),
  z.object({ kind: z.literal('Table'), spec: z.object({ density: z.literal('compact') }).strict() }).strict(),
  z
    .object({
      kind: z.literal('LogsTable'),
      spec: z
        .object({
          columns: z.custom<LogColumn[]>(validLogColumns).optional(),
          density: z.enum(['compact', 'comfortable']).optional(),
          allowWrap: z.boolean().optional(),
          showTime: z.boolean().optional()
        })
        .strict()
    })
    .strict(),
  z
    .object({
      kind: z.literal('TraceTable'),
      spec: z
        .object({
          columns: z.custom<HertzBeatTraceColumn[]>(validTraceColumns).optional(),
          density: z.enum(['compact', 'comfortable']).optional()
        })
        .strict()
    })
    .strict(),
  z.object({ kind: z.literal('TracingGanttChart'), spec: emptyOptions }).strict()
]);
const querySchema = z
  .object({
    kind: z.enum(['TimeSeriesQuery', 'LogQuery', 'TraceQuery']),
    spec: z
      .object({
        plugin: z
          .object({
            kind: z.enum(['HertzBeatTimeSeriesQuery', 'HertzBeatLogQuery', 'HertzBeatTraceQuery']),
            spec: z.object({ version: z.literal(1), query: dashboardQuerySchema }).strict()
          })
          .strict()
      })
      .strict()
  })
  .strict();
const pairs = {
  TimeSeriesChart: ['TimeSeriesQuery', 'HertzBeatTimeSeriesQuery', 'metrics', 'time-series'],
  StatChart: ['TimeSeriesQuery', 'HertzBeatTimeSeriesQuery', 'metrics', 'time-series'],
  GaugeChart: ['TimeSeriesQuery', 'HertzBeatTimeSeriesQuery', 'metrics', 'time-series'],
  Table: ['TimeSeriesQuery', 'HertzBeatTimeSeriesQuery', 'metrics', 'time-series'],
  LogsTable: ['LogQuery', 'HertzBeatLogQuery', 'logs', 'table'],
  TraceTable: ['TraceQuery', 'HertzBeatTraceQuery', 'traces', 'table'],
  TracingGanttChart: ['TraceQuery', 'HertzBeatTraceQuery', 'traces', 'gantt']
} as const;

export const dashboardPanelSchema = z
  .object({
    kind: z.literal('Panel'),
    spec: z
      .object({
        display: dashboardDisplaySchema,
        plugin: panelPluginSchema,
        queries: z.tuple([querySchema])
      })
      .strict()
  })
  .strict()
  .refine(panel => {
    const query = panel.spec.queries[0];
    const plugin = query.spec.plugin;
    const analytical = plugin.spec.query;
    if (analytical.signal === 'logs' && analytical.queryKind === 'analysis') {
      return validLogAnalysisPair(panel.spec.plugin, query, analytical.analysis.representation);
    }
    const actual = [query.kind, plugin.kind, plugin.spec.query.signal, plugin.spec.query.queryKind];
    if (
      ['TimeSeriesChart', 'StatChart', 'GaugeChart', 'Table'].includes(panel.spec.plugin.kind) &&
      actual[3] === 'composition'
    )
      actual[3] = 'time-series';
    if (panel.spec.plugin.kind === 'TraceTable' && ['spans', 'groups'].includes(actual[3]!)) actual[3] = 'table';
    return pairs[panel.spec.plugin.kind].every((value, index) => value === actual[index]);
  }, 'Panel and query plugin must match');

function validLogAnalysisPair(
  visual: z.infer<typeof panelPluginSchema>,
  query: z.infer<typeof querySchema>,
  representation: string
) {
  const chart = representation === 'timeseries';
  return (
    visual.kind === (chart ? 'TimeSeriesChart' : 'LogsTable') &&
    query.kind === (chart ? 'TimeSeriesQuery' : 'LogQuery') &&
    query.spec.plugin.kind === (chart ? 'HertzBeatTimeSeriesQuery' : 'HertzBeatLogQuery') &&
    Object.keys(visual.spec).every(key => chart && key === 'visual')
  );
}
