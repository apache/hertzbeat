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

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { HertzBeatLogsTableResult } from '@/platform/perses';
import { logRowOrder } from '../model/explore-log-order';
import { buildExplorePath } from '../model/explore-model';
import type { LogRow } from '../model/explore-signal-contract';
import type { SelectionProps } from './explore-log-table-selection-contract';
import { useLogSelection } from './use-log-selection';
import { usePagedLogSelection } from './use-paged-log-selection';
import { logRowSelection } from './explore-log-row-selection';
import { SelectedLogInspector } from './explore-selected-log-inspector';
import { explorePersesMessages } from './explore-perses-messages';
import { useLogCalculatedFromField } from './explore-log-calculated-from-field-context';
import historyStyles from './explore-history-result.module.css';

const inspectorId = 'explore-log-inspector';
export function SelectablePersesLogTable(props: SelectionProps) {
  const { rows, query, runtimeIdentity, logDisplay } = props;
  const { t } = useTranslation();
  const calculatedField = useLogCalculatedFromField();
  const {
    hostRef,
    orderedRows,
    selectedIndex,
    selectedRow,
    selectedAt,
    selectTableRow,
    selectOrNavigate,
    closeInspectorAndCancelNavigation
  } = useSelectableLogTable(props);
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
        <SelectedLogInspector
          props={props}
          selectedRow={selectedRow}
          selectedIndex={selectedIndex}
          selectedAt={selectedAt}
          orderedRows={orderedRows}
          selectOrNavigate={selectOrNavigate}
          closeInspectorAndCancelNavigation={closeInspectorAndCancelNavigation}
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

function useSelectableLogTable(props: SelectionProps) {
  const { rows, query, runtimeIdentity, evidenceCurrent, openPath } = props;
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
  return {
    hostRef,
    orderedRows,
    selectedIndex,
    selectedRow,
    selectedAt,
    selectTableRow,
    selectOrNavigate,
    closeInspectorAndCancelNavigation
  };
}
