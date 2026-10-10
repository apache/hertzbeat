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

import { TracingGanttChartCore } from '@perses-dev/tracing-gantt-chart-plugin';
import { ChartsThemeContext, useChartsContext } from '@perses-dev/components';
import type { TraceData } from '@perses-dev/spec';
import { useMemo, useState } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { HertzBeatTraceToolbar, type TraceDisplayOptions } from './hertzbeat-trace-toolbar';
import styles from './hertzbeat-tracing-gantt-adapter.module.css';

// Reference-derived service hues from the Datadog trace waterfall; local to this Gantt.
const SERVICE_COLORS = ['#f8cc2d', '#8f80b6', '#4e745b', '#d28751'];

const INITIAL_TRACE_DISPLAY: TraceDisplayOptions = {
  errorsOnly: false,
  collapsed: false,
  collapseRevision: 0,
  color: 'auto',
  list: false
};

type Props = {
  data: TraceData;
  selectedSpanId?: string | undefined;
  onSpanSelect?: ((spanId: string | undefined) => void) | undefined;
  evidenceIdentity?: string | undefined;
};

export function HertzBeatTracingGanttAdapter(props: Props) {
  const fingerprint = useMemo(
    () =>
      props.evidenceIdentity
        ? undefined
        : JSON.stringify(props.data.trace, (_key, value: unknown) =>
            typeof value === 'bigint' ? value.toString() : value
          ),
    [props.data.trace, props.evidenceIdentity]
  );
  if (!props.data.trace) return null;
  const traceId = firstTraceId(props.data.trace);
  const identity = props.evidenceIdentity ? `${props.evidenceIdentity}:${traceId ?? ''}` : fingerprint;
  return <GanttWorkspace key={identity} {...props} />;
}

function firstTraceId(trace: NonNullable<TraceData['trace']>) {
  for (const resourceSpan of trace.resourceSpans) {
    for (const scopeSpan of resourceSpan.scopeSpans) {
      const traceId = scopeSpan.spans[0]?.traceId;
      if (traceId) return traceId;
    }
  }
  return undefined;
}

function GanttWorkspace(props: Props) {
  const { t } = useTranslation();
  const chartsContext = useChartsContext();
  const traceChartsContext = useMemo(
    () => ({
      ...chartsContext,
      chartsTheme: {
        ...chartsContext.chartsTheme,
        echartsTheme: { ...chartsContext.chartsTheme.echartsTheme, color: SERVICE_COLORS }
      }
    }),
    [chartsContext]
  );
  const [view, setView] = useState(INITIAL_TRACE_DISPLAY);
  const [overview, setOverview] = useState(false);
  if (!props.data.trace) return null;
  return (
    <ChartsThemeContext.Provider value={traceChartsContext}>
      <div className={styles.gantt} data-hertzbeat-gantt>
        <div className={styles.chart}>
          <TracingGanttChartCore
            trace={props.data.trace}
            options={{
              visual: { palette: { mode: view.color === 'auto' ? 'categorical' : 'status' }, spanList: view.list },
              ...(props.selectedSpanId ? { selectedSpanId: props.selectedSpanId } : {})
            }}
            displayOptions={{
              ...view,
              ...traceSearchLabels(t),
              durationLabel: t('exploreInvestigation.trace.duration'),
              emptyLabel: t('explore.traceTools.noMatches')
            }}
            {...(props.selectedSpanId ? { selectedSpanId: props.selectedSpanId } : {})}
            {...(props.onSpanSelect ? { onSelectSpan: props.onSpanSelect } : {})}
            hideHeader
            hideDetails={props.onSpanSelect != null}
            hideMiniMap={!overview}
            toolbarActions={
              <>
                <HertzBeatTraceToolbar view={view} onChange={setView} selectedSpanId={props.selectedSpanId} />
                <Button
                  className={styles.overview ?? ''}
                  type="text"
                  aria-expanded={overview}
                  onClick={() => setOverview(value => !value)}
                >
                  {t('exploreInvestigation.trace.timelineOverview')}
                </Button>
              </>
            }
          />
        </div>
      </div>
    </ChartsThemeContext.Provider>
  );
}

function traceSearchLabels(t: ReturnType<typeof useTranslation>['t']) {
  return {
    serviceOperationLabel: t('explore.traceTools.serviceOperation'),
    searchLabels: {
      search: t('explore.traceTools.search'),
      previous: t('explore.traceTools.previousMatch'),
      next: t('explore.traceTools.nextMatch'),
      clear: t('explore.traceTools.clearSearch'),
      noMatches: t('explore.traceTools.searchNoMatches')
    }
  };
}
