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

import type { ReactNode } from 'react';
import { Select, Segmented } from 'antd';
import { useTranslation } from 'react-i18next';
import type { useExplorePageController } from '../controller/use-explore-page-controller';
import type { useTraceAnalytics } from '../controller/use-trace-analytics';
import { ExploreTraceHistogram } from '../components/explore-trace-histogram';
import { ExploreTraceGroups } from '../components/explore-trace-groups';
import { ExploreSpanTable } from '../components/explore-span-table';
import { ExploreTraceColumns } from '../components/explore-trace-columns';
import { LogViewNotice } from '../components/explore-log-view-notice';
import { buildExplorePath } from '../model/explore-model';
import { readTraceFacetGroup, traceFacetAction } from '../model/explore-trace-facet-action';
import type { TraceSpanRow } from '../model/explore-trace-analytics';
import styles from '../components/explore-trace-population.module.css';
type Props = {
  controller: ReturnType<typeof useExplorePageController>;
  analytics: ReturnType<typeof useTraceAnalytics>;
  children: ReactNode;
};
export function ExploreTraceWorkspaceResults({ controller, analytics, children }: Props) {
  const { view, histogram, groups, spans, window } = analytics;
  const query = controller.query,
    ready = controller.result.kind === 'ready';
  if (query.signal !== 'traces') return children;
  const selected = view.view;
  const showList = selected.mode === 'list';
  const onPage = (pageIndex: number) =>
    window && controller.updateQuery({ pageIndex, start: window.from, end: window.to });
  const draft = controller.submission.draft;
  const canGroup =
    ready && draft.signal === 'traces' && readTraceFacetGroup(draft, query, selected.groupBy).state === 'ready';
  const group = (value: string) => {
    const draft = controller.submission.draft;
    if (draft.signal !== 'traces' || !ready) return;
    const update = traceFacetAction(
      draft,
      query,
      selected.groupBy,
      value,
      analytics.facetSelection.mode(selected.groupBy)
    );
    if (update) controller.submission.updateField(update);
  };
  return (
    <>
      <LogViewNotice display={view} />
      <TraceResultsToolbar view={view} />
      <ExploreTraceHistogram
        load={histogram}
        retry={histogram.retry}
        onWindowChange={
          ready
            ? selected => controller.updateQuery({ ...selected, pageIndex: undefined, windowMode: undefined })
            : undefined
        }
      />
      {showList ? (
        selected.population === 'matched_traces' ? (
          children
        ) : (
          <ExploreSpanTable
            load={spans}
            retry={spans.retry}
            display={selected}
            onPage={ready ? onPage : undefined}
            onOpen={ready ? row => openSpan(controller, window, row) : undefined}
            timeZone={query.timeZone}
          />
        )
      ) : (
        <ExploreTraceGroups load={groups} retry={groups.retry} onGroup={canGroup ? group : undefined} />
      )}
    </>
  );
}

function TraceResultsToolbar({ view }: { view: Props['analytics']['view'] }) {
  const { t } = useTranslation();
  const selected = view.view,
    change = view.onChange;
  const showList = selected.mode === 'list';
  return (
    <div className={styles.toolbar}>
      <Select
        aria-label={t('exploreTrace.analytics.population')}
        value={selected.population}
        options={(['matched_traces', 'matched_spans'] as const).map(value => ({
          value,
          label: t(`exploreTrace.analytics.${value}`)
        }))}
        onChange={population => change({ ...selected, population })}
      />
      <Segmented
        aria-label={t('exploreTrace.analytics.representation')}
        value={selected.mode}
        options={(['list', 'groups'] as const).map(value => ({ value, label: t(`exploreTrace.analytics.${value}`) }))}
        onChange={mode => change({ ...selected, mode })}
      />
      {showList ? (
        <ExploreTraceColumns
          population={selected.population}
          display={selected}
          onChange={display => change({ ...selected, ...display })}
        />
      ) : (
        <Select
          aria-label={t('exploreTrace.analytics.groupBy')}
          value={selected.groupBy}
          options={(['serviceName', 'operationName', 'environment'] as const).map(value => ({
            value,
            label: t(`exploreTrace.analytics.fields.${value}`)
          }))}
          onChange={groupBy => change({ ...selected, groupBy })}
        />
      )}
    </div>
  );
}

function openSpan(controller: Props['controller'], window: Props['analytics']['window'], row: TraceSpanRow) {
  const query = controller.query;
  if (query.signal !== 'traces' || !window || controller.result.kind !== 'ready') return;
  const returnTo = buildExplorePath({ ...query, start: window.from, end: window.to, windowMode: undefined });
  controller.openPath(
    buildExplorePath({
      ...query,
      traceId: row.traceId,
      spanId: row.spanId,
      start: window.from,
      end: window.to,
      timeZone: query.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      returnTo
    })
  );
}
