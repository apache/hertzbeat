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

import { DashboardLogAnalysis } from './dashboard-log-analysis';
import { DashboardPanelActions } from './dashboard-panel-actions';
import { useTranslation } from 'react-i18next';
import { dashboardLogDisplay, dashboardTraceDisplay } from '../model/dashboard-table-display';
import type { ReactNode } from 'react';
import { DashboardTraceAnalytics } from './dashboard-trace-analytics';
import { DashboardMetricPanel } from './dashboard-metric-panel';
import { classifyExploreSignalError } from '@/features/explore';

import {
  HertzBeatLogsTableResult,
  HertzBeatTraceTableResult,
  HertzBeatTracingGanttChartResult
} from '@/platform/perses';
import type { DashboardPanelRuntimeProps } from '../model/dashboard-panel-runtime-model';
import { useDashboardPanelQuery } from './use-dashboard-panel-query';

/** Query actions follow runtime state; the dashboard owns headings and the containing surface. */
export function DashboardPanelRuntime(props: DashboardPanelRuntimeProps) {
  const { result, resolution, runtimeIdentity } = useDashboardPanelQuery(props);
  const title = props.panel.spec.display.name;
  const state = (content: ReactNode, alert = false) => (
    <div className={props.className} role={alert ? 'alert' : 'status'} aria-label={title}>
      {content}
    </div>
  );
  const loading = props.enabled && resolution.state === 'ready' && result.isFetching;
  const failed = result.isError || result.data?.outcome.state === 'error';
  let content: ReactNode;
  if (!props.enabled) content = state(props.messages.inactive);
  else if (resolution.state === 'invalid') content = state(props.messages.failures['perses.query.invalid'], true);
  else if (result.isError) content = state(props.messages.failures[panelFailureKey(resolution, result.error)], true);
  else if (result.isFetching || !result.data) content = state(props.messages.loading);
  else content = <ResolvedDashboardPanel props={props} result={result.data} runtimeIdentity={runtimeIdentity} />;
  return (
    <>
      {props.actions && panelActionsEnabled(props, resolution.state) && (
        <DashboardPanelActions actions={props.actions} loading={loading} failed={failed} />
      )}
      {content}
    </>
  );
}

function panelFailureKey(
  resolution: ReturnType<typeof useDashboardPanelQuery>['resolution'],
  error: unknown
): keyof DashboardPanelRuntimeProps['messages']['failures'] {
  if (resolution.state !== 'ready' || resolution.query.signal !== 'logs' || !resolution.query.logCalculatedV2)
    return 'perses.query.unavailable';
  const kind = classifyExploreSignalError(error);
  if (kind === 'calculated_budget_exceeded') return 'perses.query.overloaded';
  if (kind === 'invalid_query' || kind === 'invalid_filter' || kind === 'calculated_invalid_pattern')
    return 'perses.query.invalid';
  if (kind === 'permission') return 'perses.query.permission';
  if (kind === 'contract_error') return 'perses.query.contract';
  return 'perses.query.unavailable';
}

function panelActionsEnabled(props: DashboardPanelRuntimeProps, resolution: string) {
  return resolution === 'ready' && (props.enabled || props.actions?.cancelled);
}

function ResolvedDashboardPanel({
  props,
  result,
  runtimeIdentity
}: {
  props: DashboardPanelRuntimeProps;
  result: NonNullable<ReturnType<typeof useDashboardPanelQuery>['result']['data']>;
  runtimeIdentity: string;
}) {
  const { t } = useTranslation();
  const title = props.panel.spec.display.name;
  const common = {
    title,
    ariaLabel: title,
    messages: props.messages,
    className: props.className,
    runtimeIdentity,
    variant: 'fill' as const
  };
  const data = result;
  const plugin = props.panel.spec.plugin;
  if (data.kind === 'metrics' || data.kind === 'metric-composition')
    return <DashboardMetricPanel data={data} plugin={plugin} common={common} timeZone={props.timeZone} />;
  if (data.kind === 'log-analysis')
    return <DashboardLogAnalysis {...data} timeZone={props.timeZone} messages={props.messages} />;
  if (data.kind === 'logs' || data.kind === 'calculated-logs')
    return (
      <HertzBeatLogsTableResult
        {...common}
        query={data.query}
        outcome={data.outcome}
        preserveLogOrder={data.kind === 'calculated-logs'}
        logDisplay={dashboardLogDisplay(
          plugin,
          data.outcome.state === 'ready' ? data.outcome.data.rows : [],
          t,
          data.query.sort,
          props.timeZone,
          data.query.logSort,
          data.kind === 'calculated-logs' ? data.calculated : undefined
        )}
      />
    );
  if (data.kind === 'trace-table')
    return (
      <HertzBeatTraceTableResult
        {...common}
        query={data.query}
        outcome={data.outcome}
        traceDisplay={dashboardTraceDisplay(plugin)}
      />
    );
  if (data.kind === 'trace-spans' || data.kind === 'trace-groups')
    return <DashboardTraceAnalytics {...data} display={dashboardTraceDisplay(plugin)} timeZone={props.timeZone} />;
  return <HertzBeatTracingGanttChartResult {...common} query={data.query} outcome={data.outcome} />;
}
