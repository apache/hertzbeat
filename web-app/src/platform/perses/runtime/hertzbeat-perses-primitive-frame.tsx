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

import type { HertzBeatTraceDisplay } from './perses-trace-display';
/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { TraceTableServerPagination } from '@perses-dev/trace-table-plugin';
import { Component, lazy, Suspense, type ReactNode } from 'react';

import type { ExactTimeWindow } from '@/shared/query-context';

import type { HertzBeatQueryFailure, HertzBeatQueryOutcome } from '../datasource/hertzbeat-query-contract';
import { PersesSignalDataError } from './perses-signal-data';
import { loadPersesRuntime } from './perses-runtime-registry';
import type { HertzBeatLogRowSelection } from './hertzbeat-logs-table-adapter';
import type { HertzBeatLogTableDisplay } from './perses-log-display';
import styles from './hertzbeat-perses-primitives.module.css';

type FailureMessageKey = HertzBeatQueryFailure['messageKey'];

export type HertzBeatPersesPrimitiveMessages = {
  loading: ReactNode;
  empty: ReactNode;
  truncated: ReactNode;
  truncationUnknown: ReactNode;
  bounded?: ((rowLimit: number | null) => ReactNode) | undefined;
  runtimeError: ReactNode;
  failures: Record<FailureMessageKey, ReactNode>;
};

export type SharedPrimitiveProps = {
  title: string;
  ariaLabel: string;
  messages: HertzBeatPersesPrimitiveMessages;
  className?: string | undefined;
  runtimeIdentity?: string | undefined;
  onTimeWindowChange?: ((window: ExactTimeWindow) => void) | undefined;
  timeWindowChangeEnabled?: boolean | undefined;
  timeSeriesLegend?: boolean | undefined;
  timeSeriesDisplay?: 'line' | 'bar' | undefined;
  timeSeriesCompact?: boolean | undefined;
  timeSeriesCountAxisMax?: number | undefined;
  timeSeriesTimestamp?: ((timestamp: number) => ReactNode) | undefined;
  timeSeriesYDomain?: { min?: number | undefined; max?: number | undefined } | undefined;
  metricPanel?: { kind: 'StatChart' | 'GaugeChart' | 'Table'; max?: number } | undefined;
  variant?: 'default' | 'compact' | 'fill' | undefined;
  logDisplay?: HertzBeatLogTableDisplay | undefined;
  traceDisplay?: HertzBeatTraceDisplay | undefined;
  tracePagination?: TraceTableServerPagination | undefined;
  traceLinks?: Readonly<Record<string, string>> | undefined;
  traceUnavailableLinks?: Readonly<Record<string, string>> | undefined;
  onTraceNavigate?: ((path: string) => void) | undefined;
  onSpanSelect?: ((spanId: string | undefined) => void) | undefined;
  logRowSelection?: HertzBeatLogRowSelection | undefined;
  preserveLogOrder?: boolean | undefined;
};

export type PrimitiveState<T> =
  { kind: 'loading'; queryKey: string } | { kind: 'resolved'; queryKey: string; outcome: HertzBeatQueryOutcome<T> };
type ReadyOutcome<T> = Extract<HertzBeatQueryOutcome<T>, { state: 'ready' }>;
export type HertzBeatPrimitiveFrameProps<T> = SharedPrimitiveProps & {
  state: PrimitiveState<T>;
  toRuntimeProps: (outcome: ReadyOutcome<T>) => SignalRuntimeProps;
};

async function loadPersesSignalRuntime() {
  const module = await loadPersesRuntime();
  return { default: module.PersesSignalRuntime };
}

const PersesSignalRuntime = lazy(loadPersesSignalRuntime);
type SignalRuntimeProps = React.ComponentProps<typeof PersesSignalRuntime>;

export function HertzBeatPrimitiveFrame<T>({ state, toRuntimeProps, ...props }: HertzBeatPrimitiveFrameProps<T>) {
  const className = [styles.primitive, props.className].filter(Boolean).join(' ');
  if (state.kind === 'loading') return <PrimitiveStateFrame {...props}>{props.messages.loading}</PrimitiveStateFrame>;
  const { outcome } = state;
  if (outcome.state === 'empty')
    return (
      <PrimitiveStateFrame {...props}>
        {props.messages.empty}
        <Completeness ariaLabel={props.ariaLabel} outcome={outcome} messages={props.messages} />
      </PrimitiveStateFrame>
    );
  if (outcome.state === 'error') {
    return (
      <PrimitiveStateFrame {...props} alert>
        {props.messages.failures[outcome.error.messageKey]}
      </PrimitiveStateFrame>
    );
  }
  let runtimeProps: SignalRuntimeProps;
  try {
    runtimeProps = toRuntimeProps(outcome);
  } catch (error) {
    if (!(error instanceof PersesSignalDataError)) throw error;
    return (
      <PrimitiveStateFrame {...props} alert>
        {props.messages.failures['perses.query.contract']}
      </PrimitiveStateFrame>
    );
  }
  const runtimeRole = metricRuntimeRole(runtimeProps);
  return (
    <div
      className={className}
      data-visualization-runtime="perses"
      data-variant={props.variant ?? 'default'}
      data-metric-panel={props.metricPanel?.kind}
      data-log-density={props.logDisplay?.density}
      data-log-wrap={props.logDisplay?.wrap}
      data-log-show-time={props.logDisplay?.showTime}
    >
      <PersesPrimitiveErrorBoundary
        ariaLabel={props.ariaLabel}
        fallback={props.messages.runtimeError}
        resetKey={state.queryKey}
      >
        <div className={styles.runtime} role={runtimeRole} aria-label={props.ariaLabel}>
          <Suspense fallback={<div className={styles.state}>{props.messages.loading}</div>}>
            <PersesSignalRuntime {...runtimeProps} />
          </Suspense>
        </div>
      </PersesPrimitiveErrorBoundary>
      <Completeness ariaLabel={props.ariaLabel} outcome={outcome} messages={props.messages} />
    </div>
  );
}

function metricRuntimeRole(props: SignalRuntimeProps): 'img' | 'region' {
  return props.kind === 'metric-time-series' && props.panel?.kind !== 'Table' ? 'img' : 'region';
}

function PrimitiveStateFrame(props: SharedPrimitiveProps & { alert?: boolean; children: ReactNode }) {
  const className = [styles.primitive, props.className].filter(Boolean).join(' ');
  return (
    <div
      className={className}
      role={props.alert ? 'alert' : 'status'}
      aria-label={props.ariaLabel}
      data-variant={props.variant ?? 'default'}
    >
      <div className={styles.state}>{props.children}</div>
    </div>
  );
}

function Completeness(props: {
  ariaLabel: string;
  outcome: Extract<HertzBeatQueryOutcome<unknown>, { state: 'ready' | 'empty' }>;
  messages: HertzBeatPersesPrimitiveMessages;
}) {
  const { truncated, query } = props.outcome;
  if (truncated === false && query?.coverage !== 'bounded') return null;
  return (
    <div className={styles.completeness} role="status" aria-label={`${props.ariaLabel} completeness`}>
      {truncated === true
        ? props.messages.truncated
        : truncated === false && query?.coverage === 'bounded'
          ? (props.messages.bounded?.(query.rowLimit) ?? props.messages.truncationUnknown)
          : props.messages.truncationUnknown}
    </div>
  );
}

class PersesPrimitiveErrorBoundary extends Component<
  { ariaLabel: string; fallback: ReactNode; resetKey: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previousProps: Readonly<typeof this.props>) {
    if (this.state.failed && previousProps.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    if (this.state.failed) {
      return (
        <div className={styles.state} role="alert" aria-label={this.props.ariaLabel}>
          {this.props.fallback}
        </div>
      );
    }
    return this.props.children;
  }
}
