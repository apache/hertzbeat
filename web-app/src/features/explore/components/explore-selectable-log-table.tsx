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

import type { LogInspectorAnalysisControls } from '../model/explore-log-inspector-analysis';
import { logRowOrder, type LogSortControls } from '../model/explore-log-order';
import { isLogRecordUid } from '../model/explore-field-contract';

import type { LogColumnControls } from '../model/explore-log-columns';
import type { LogInspectorFilterControls } from '../model/explore-log-inspector-filter';
import { traceAction } from './log-trace-action';
import { inspectorAnalysisControls, useLogSelection } from './use-log-selection';
import { liveTraceWindow } from '../model/explore-live-log-model';
import { formatShortLocalTimeRange } from '@/shared/time';
import { useTranslation } from 'react-i18next';
import { HertzBeatLogsTableResult } from '@/platform/perses';
import type { ExactTimeWindow } from '@/shared/query-context';
import { buildLogInvestigationPath } from '../model/explore-investigation-model';
import type { createExploreLogPersesResult } from '../model/explore-perses-result-model';
import { buildExplorePath, type LogExploreQuery } from '../model/explore-model';
import type { LogRow, LogHistoryEvidence, CalculatedPageResponse } from '../model/explore-signal-contract';
import { selectedCalculatedValues } from './explore-calculated-log-columns';
import { logRowSelection } from './explore-log-row-selection';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { ExploreLogInspector } from './explore-log-inspector';
import { explorePersesMessages } from './explore-perses-messages';
import historyStyles from './explore-history-result.module.css';
import { useLogCalculatedFromField } from './explore-log-calculated-from-field-context';
type SelectionProps = LogInspectorFilterControls &
  LogInspectorAnalysisControls & {
    logOrder?: LogSortControls | undefined;
    selectionReset?: number | undefined;
    onSelectionChange?: (() => void) | undefined;
    renderLogContext?: ((row: LogRow) => ReactNode) | undefined;
    logColumns?: LogColumnControls | undefined;
    rows: LogRow[];
    page?: LogHistoryEvidence['page'] | undefined;
    calculated?: CalculatedPageResponse | undefined;
    query: LogExploreQuery;
    timeWindow: ExactTimeWindow;
    runtimeIdentity: string;
    persesQuery: ReturnType<typeof createExploreLogPersesResult>['query'];
    persesOutcome: ReturnType<typeof createExploreLogPersesResult>['outcome'];
    logDisplay: Parameters<typeof HertzBeatLogsTableResult>[0]['logDisplay'];
    evidenceCurrent: boolean;
    openPath: (path: string) => void;
  };
const inspectorId = 'explore-log-inspector';
// eslint-disable-next-line complexity -- row selection, page transitions, and the attached Inspector share one ownership boundary.
export function SelectablePersesLogTable(props: SelectionProps) {
  const { rows, query, runtimeIdentity, logDisplay, evidenceCurrent, openPath } = props;
  const { t } = useTranslation();
  const calculatedField = useLogCalculatedFromField();
  // A live buffer window moves with arrivals; only a new evidence session resets its Inspector.
  const selectionScope = query.live
    ? runtimeIdentity
    : `${buildExplorePath({ ...query, pageIndex: undefined })}:${props.timeWindow.from}:${props.timeWindow.to}`;
  const { hostRef, orderedRows, selectedIndex, selectedRow, selectedAt, selectRow, closeInspector } = useLogSelection(
    rows,
    `${selectionScope}:${props.selectionReset ?? 0}`,
    evidenceCurrent,
    selectionOrder(props),
    props.onSelectionChange,
    Boolean(query.live)
  );
  const { selectOrNavigate, cancelPendingNavigation } = usePagedLogSelection({
    rows: orderedRows,
    page: props.page,
    query,
    timeWindow: props.timeWindow,
    evidenceCurrent,
    selectRow,
    openPath
  });
  const selectTableRow = useCallback(
    (index: number) => {
      cancelPendingNavigation();
      selectRow(index);
    },
    [cancelPendingNavigation, selectRow]
  );
  const closeInspectorAndCancelNavigation = useCallback(
    (restoreFocus = true) => {
      cancelPendingNavigation();
      closeInspector(restoreFocus);
    },
    [cancelPendingNavigation, closeInspector]
  );
  const window =
    query.live && selectedRow ? liveTraceWindow(query.timeRange, selectedRow, selectedAt!) : props.timeWindow;
  return (
    <div ref={hostRef} className={historyStyles.logResultBody} data-log-inspector-open={selectedRow ? 'true' : 'false'}>
      {(!query.live || rows.length > 0) && (
        <HertzBeatLogsTableResult
          title={t('explore.signals.logs')}
          ariaLabel={t(query.live ? 'explore.liveFlow.logsTable' : 'explore.perses.logsTable')}
          query={props.persesQuery}
          outcome={props.persesOutcome}
          runtimeIdentity={runtimeIdentity}
          logDisplay={logDisplay}
          preserveLogOrder={Boolean(props.calculated)}
          variant="fill"
          logRowSelection={selectionProps(
            props,
            orderedRows,
            selectedIndex,
            selectTableRow,
            t,
            calculatedField?.enabled ? expression => calculatedField.open(expression) : undefined
          )}
          messages={explorePersesMessages(t)}
        />
      )}
      {selectedRow && (
        <ExploreLogInspector
          scopeHint={query.live ? liveWindowHint(window, t) : undefined}
          context={selectedLogContext(selectedRow, props)}
          logColumns={props.logColumns}
          id={inspectorId}
          row={selectedRow}
          pending={!evidenceCurrent}
          calculatedValues={selectedCalculatedValues(props.calculated, selectedRow)}
          logFilterDraft={props.logFilterDraft}
          logFilterScope={props.logFilterScope}
          logFilterPending={props.logFilterPending}
          onApplyLogFilters={evidenceCurrent ? props.onApplyLogFilters : undefined}
          onAddLogFilter={evidenceCurrent ? props.onAddLogFilter : undefined}
          selectedIndex={selectedIndex}
          rowCount={orderedRows.length}
          pageIndex={props.page?.number ?? 0}
          totalPages={props.page?.totalPages ?? 1}
          evidenceCurrent={evidenceCurrent}
          onSelectIndex={selectOrNavigate}
          onInvestigate={investigateAction(selectedRow, query, window, openPath)}
          onOpenTrace={traceAction(selectedRow, query, window, openPath)}
          {...inspectorAnalysisControls(props, closeInspectorAndCancelNavigation)}
          onClose={closeInspectorAndCancelNavigation}
        />
      )}
    </div>
  );
}

function selectionOrder(props: SelectionProps) {
  return props.calculated ? 'preserve' : logRowOrder(props.query);
}

function selectionProps(
  props: SelectionProps,
  rows: LogRow[],
  selectedIndex: number | undefined,
  onSelect: (index: number) => void,
  t: ReturnType<typeof useTranslation>['t'],
  onCalculateField: ((expression: string) => void) | undefined
) {
  return logRowSelection(
    rows,
    props.query,
    props.logDisplay,
    selectedIndex,
    inspectorId,
    onSelect,
    t,
    props.logColumns,
    props.logOrder,
    props.calculated,
    onCalculateField
  );
}

function selectedLogContext(row: LogRow, props: SelectionProps) {
  return isLogRecordUid(row.logRecordUid) ? props.renderLogContext?.(row) : undefined;
}

function investigateAction(
  row: LogRow,
  query: LogExploreQuery,
  window: ExactTimeWindow,
  openPath: (path: string) => void
) {
  return isLogRecordUid(row.logRecordUid)
    ? () => openPath(buildLogInvestigationPath(query, selectedLog(row), window, browserTimeZone()))
    : undefined;
}

function selectedLog(row: LogRow) {
  return { logRecordUid: row.logRecordUid!, timeUnixNano: row.timeUnixNano, traceId: row.traceId, spanId: row.spanId };
}

function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function liveWindowHint(window: ExactTimeWindow, t: ReturnType<typeof useTranslation>['t']) {
  return `${t('explore.liveFlow.pivotWindowHint')} ${t('explore.liveFlow.pivotWindow')}: ${formatShortLocalTimeRange(window.from, window.to)}`;
}

function usePagedLogSelection({
  rows,
  page,
  query,
  timeWindow,
  evidenceCurrent,
  selectRow,
  openPath
}: {
  rows: LogRow[];
  page: SelectionProps['page'];
  query: LogExploreQuery;
  timeWindow: ExactTimeWindow;
  evidenceCurrent: boolean;
  selectRow: (index: number) => void;
  openPath: (path: string) => void;
}) {
  const scope = `${buildExplorePath({ ...query, pageIndex: undefined })}:${timeWindow.from}:${timeWindow.to}`;
  const pending = useRef<{ pageIndex: number; rowIndex: number; scope: string } | undefined>(undefined);
  useEffect(() => {
    if (pending.current?.scope !== scope) pending.current = undefined;
  }, [scope]);
  const pageNumber = page?.number;
  useEffect(() => {
    const target = pending.current;
    if (
      !target ||
      target.scope !== scope ||
      !page ||
      !evidenceCurrent ||
      pageNumber !== target.pageIndex ||
      rows.length === 0
    )
      return;
    selectRow(Math.min(target.rowIndex, rows.length - 1));
    pending.current = undefined;
  }, [evidenceCurrent, page, pageNumber, rows, scope, selectRow]);
  const selectOrNavigate = useCallback(
    (index: number) => {
      if (!evidenceCurrent) return;
      if (index >= 0 && index < rows.length) {
        pending.current = undefined;
        selectRow(index);
        return;
      }
      if (!page || pending.current?.scope === scope) return;
      const nextPage = page.number + (index < 0 ? -1 : 1);
      if (nextPage < 0 || nextPage >= page.totalPages) return;
      pending.current = { pageIndex: nextPage, rowIndex: index < 0 ? page.size - 1 : 0, scope };
      openPath(buildExplorePath({ ...query, pageIndex: nextPage || undefined }));
    },
    [evidenceCurrent, openPath, page, query, rows.length, scope, selectRow]
  );
  const cancelPendingNavigation = useCallback(() => {
    pending.current = undefined;
  }, []);
  return { selectOrNavigate, cancelPendingNavigation };
}
