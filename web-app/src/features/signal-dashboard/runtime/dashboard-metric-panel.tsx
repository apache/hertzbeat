/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import {
  HertzBeatMetricTimeSeriesResult,
  type HertzBeatMetricQuery,
  type HertzBeatMetricQueryOutcome
} from '@/platform/perses';
import type { HertzBeatMetricCompositionQuery, HertzBeatQueryOutcome } from '@/platform/perses';
import type { MetricComposition } from '@/platform/perses';
import { metricSourceOutcome } from '@/platform/perses';
import type { DashboardPanelRuntimeProps } from '../model/dashboard-panel-runtime-model';
import { DashboardMetricComposition } from './dashboard-metric-composition';
type Props = {
  data:
    | { kind: 'metrics'; query: HertzBeatMetricQuery; outcome: HertzBeatMetricQueryOutcome }
    | {
        kind: 'metric-composition';
        query: HertzBeatMetricCompositionQuery;
        outcome: HertzBeatQueryOutcome<MetricComposition>;
      };
  plugin: DashboardPanelRuntimeProps['panel']['spec']['plugin'];
  common: {
    title: string;
    ariaLabel: string;
    runtimeIdentity: string;
    messages: DashboardPanelRuntimeProps['messages'];
    className: string | undefined;
    variant: 'fill';
  };
  timeZone?: string | undefined;
};
export function DashboardMetricPanel({ data, plugin, common, timeZone }: Props) {
  const metricPanel = metricPanelFromPlugin(plugin);
  if (data.kind === 'metric-composition')
    return (
      <DashboardMetricComposition
        {...common}
        query={data.query}
        outcome={data.outcome}
        timeZone={timeZone}
        metricPanel={metricPanel}
        view={
          plugin.kind === 'TimeSeriesChart'
            ? (plugin.spec.metricView ?? { mode: 'chart', hidden: [] })
            : { mode: 'chart', hidden: [] }
        }
      />
    );
  if (data.kind === 'metrics' && plugin.kind === 'TimeSeriesChart' && plugin.spec.metricView) {
    const outcome = scalarComposition(data);
    return (
      <DashboardMetricComposition
        {...common}
        query={data.query}
        outcome={outcome}
        view={plugin.spec.metricView}
        timeZone={timeZone}
      />
    );
  }
  return (
    <HertzBeatMetricTimeSeriesResult
      {...common}
      query={data.query}
      outcome={data.outcome}
      timeSeriesCompact
      metricPanel={metricPanel}
      timeSeriesDisplay={plugin.kind === 'TimeSeriesChart' ? plugin.spec.visual?.display : undefined}
      timeWindowChangeEnabled={false}
    />
  );
}

function metricPanelFromPlugin(plugin: Props['plugin']) {
  if (plugin.kind === 'GaugeChart') return { kind: plugin.kind, max: plugin.spec.max };
  if (plugin.kind === 'StatChart' || plugin.kind === 'Table') return { kind: plugin.kind };
  return undefined;
}

function scalarComposition(data: {
  query: import('@/platform/perses').HertzBeatMetricQuery;
  outcome: import('@/platform/perses').HertzBeatMetricQueryOutcome;
}) {
  return data.outcome.state === 'ready'
    ? {
        ...data.outcome,
        data: {
          plan: { version: 1 as const, queries: [{ refId: 'a', metric: data.query.metric.name }], formulas: [] },
          sources: [metricSourceOutcome('a', data.outcome)],
          formulas: []
        }
      }
    : data.outcome;
}
