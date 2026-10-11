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

import { useTranslation } from 'react-i18next';
import { isLogRecordUid } from '../model/explore-field-contract';
import { liveTraceWindow } from '../model/explore-live-log-model';
import { formatShortLocalTimeRange } from '@/shared/time';
import type { ExactTimeWindow } from '@/shared/query-context';
import { buildLogInvestigationPath } from '../model/explore-investigation-model';
import type { LogExploreQuery } from '../model/explore-model';
import type { LogRow } from '../model/explore-signal-contract';
import { traceAction } from './log-trace-action';
import { inspectorAnalysisControls } from './use-log-selection';
import { selectedCalculatedValues } from './explore-calculated-log-columns';
import { ExploreLogInspector } from './explore-log-inspector';
import type { SelectionProps } from './explore-log-table-selection-contract';
const inspectorId = 'explore-log-inspector';

export function SelectedLogInspector({
  props,
  selectedRow,
  selectedIndex,
  selectedAt,
  orderedRows,
  selectOrNavigate,
  closeInspectorAndCancelNavigation
}: {
  props: SelectionProps;
  selectedRow: LogRow;
  selectedIndex: number | undefined;
  selectedAt: number | undefined;
  orderedRows: LogRow[];
  selectOrNavigate: (index: number) => void;
  closeInspectorAndCancelNavigation: (restoreFocus?: boolean) => void;
}) {
  const { query, evidenceCurrent, openPath } = props;
  const { t } = useTranslation();
  const window = query.live ? liveTraceWindow(query.timeRange, selectedRow, selectedAt!) : props.timeWindow;
  return (
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
