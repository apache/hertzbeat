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

import { DEFAULT_TRACE_VIEW, readTraceView } from '../model/explore-trace-view';
/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { HertzBeatTraceTableResult } from '@/platform/perses';
import { usePublishShellInvestigation } from '@/shared/investigation';
import type { ExactTimeWindow } from '@/shared/query-context';

import { ExploreTraceResultActions } from '../components/explore-trace-result-actions';
import { explorePersesMessages } from '../components/explore-perses-messages';
import { ExploreMessageResult, ExploreResultFrame } from '../components/explore-state-panel';
import { SignalEmptyState, SignalResultFrame } from '../components/signal-result-frame';
import { materializeTraceInvestigation } from '../model/explore-agent-handoff';
import { createTraceNavigation } from '../model/explore-trace-navigation';
import { createExploreTracePersesResult } from '../model/explore-perses-result-model';
import { buildExplorePath, type TraceExploreQuery } from '../model/explore-model';
import { ExploreSignalContractError, type TracePageResult } from '../model/explore-signal-contract';

type Props = {
  data: TracePageResult;
  query: TraceExploreQuery;
  openPath: (path: string) => void;
  timeWindow: ExactTimeWindow | undefined;
  revision: number;
  evidenceCurrent: boolean;
};

export function ExplorePersesTracePanel(props: Props) {
  const { data, query, timeWindow, revision, evidenceCurrent } = props;
  const { t } = useTranslation();
  usePublishShellInvestigation(
    useMemo(
      () => materializeTraceInvestigation(query, undefined, evidenceCurrent ? timeWindow : undefined),
      [evidenceCurrent, query, timeWindow]
    )
  );
  if (!timeWindow) return <ExploreMessageResult kind="error" message={t('explore.states.contractError')} />;
  let result;
  try {
    result = createExploreTracePersesResult(query, data, timeWindow, revision);
  } catch (error) {
    if (!(error instanceof ExploreSignalContractError)) throw error;
    return <ExploreMessageResult kind="error" message={t('explore.states.contractError')} />;
  }
  const navigation = evidenceCurrent
    ? createTraceNavigation(
        data.content,
        query,
        timeWindow,
        browserTimeZone(),
        t('explore.perses.traceTable.windowTooWide')
      )
    : undefined;
  const structureCoverage = structureResultCoverage(props, t);
  return (
    <ExploreResultFrame layout="fill" data-trace-results tabIndex={-1}>
      <SignalResultFrame
        title={t('explore.signals.traces')}
        count={data.totalElements}
        meta={structureCoverage.meta}
        actions={<ExploreTraceResultActions data={data} evidenceCurrent={evidenceCurrent} />}
      >
        {structureCoverage.incomplete && <p role="status">{t('exploreTrace.structure.truncated')}</p>}
        <TraceResultContent
          {...props}
          result={result}
          navigation={navigation}
          incomplete={structureCoverage.incomplete}
        />
      </SignalResultFrame>
    </ExploreResultFrame>
  );
}

function structureResultCoverage({ query, data }: Props, t: ReturnType<typeof useTranslation>['t']) {
  const bounded = query.traceStructure !== undefined && data.query?.coverage === 'bounded';
  return {
    incomplete: bounded && data.query?.truncated !== false,
    meta:
      bounded && data.query?.rowLimit
        ? [
            {
              label: t('exploreTrace.structure.mode'),
              value: t('exploreTrace.structure.bounded', { limit: data.query.rowLimit })
            }
          ]
        : []
  };
}

function TraceResultContent({
  data,
  query,
  openPath,
  incomplete,
  result,
  navigation,
  ...props
}: Props & {
  incomplete: boolean;
  result: ReturnType<typeof createExploreTracePersesResult>;
  navigation: ReturnType<typeof createTraceNavigation> | undefined;
}) {
  const { t } = useTranslation();
  if (data.totalElements === 0 && incomplete)
    return <ExploreMessageResult kind="unavailable" message={t('exploreTrace.structure.truncated')} />;
  if (data.totalElements === 0)
    return (
      <SignalEmptyState
        title={t('explore.empty.traces')}
        hint={t('explore.recovery.traces')}
        reviewQueryLabel={t('explore.recovery.reviewQuery')}
      />
    );
  return (
    <HertzBeatTraceTableResult
      title={t('explore.signals.traces')}
      ariaLabel={t('explore.perses.tracesTable')}
      query={result.query}
      outcome={result.outcome}
      runtimeIdentity={result.runtimeIdentity}
      traceLinks={navigation?.links}
      traceUnavailableLinks={navigation?.unavailableLinks}
      tracePagination={tracePagination({ data, query, openPath, ...props })}
      traceDisplay={traceDisplay(query.traceView)}
      onTraceNavigate={openPath}
      variant="fill"
      messages={explorePersesMessages(t)}
    />
  );
}

function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function tracePagination({ data, query, evidenceCurrent, openPath, timeWindow }: Props) {
  return {
    page: data.number,
    pageSize: data.size,
    total: data.totalElements,
    disabled: !evidenceCurrent,
    onPageChange: (page: number) => {
      if (evidenceCurrent && timeWindow && Number.isSafeInteger(page) && page >= 0 && page < data.totalPages)
        openPath(
          buildExplorePath({
            ...query,
            start: timeWindow.from,
            end: timeWindow.to,
            windowMode: undefined,
            pageIndex: page || undefined
          })
        );
    }
  };
}

function traceDisplay(value: string | undefined) {
  return readTraceView(value) ?? DEFAULT_TRACE_VIEW;
}
