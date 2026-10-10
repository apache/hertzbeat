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

import { useTranslation } from 'react-i18next';
import type { ExactTimeWindow } from '@/shared/query-context';
import { ExploreLogContext } from './explore-log-context';
import { ExploreLogResultToolbar } from '../components/explore-log-result-toolbar';
import { SelectablePersesLogTable } from '../components/explore-selectable-log-table';
import { LogViewNotice } from '../components/explore-log-view-notice';
import { SignalEmptyState, SignalResultFrame } from '../components/signal-result-frame';
import { LogFacetVisibilityButton } from '../components/explore-log-facet-visibility';
import type { useLogView } from '../controller/use-log-view';
import type { availableLogColumns } from '../model/explore-log-columns';
import type { createExploreLogPersesResult } from '../model/explore-perses-result-model';
import type { ExplorePersesLogPanelProps } from '../model/explore-perses-log-panel-props';

type LogResultsProps = ExplorePersesLogPanelProps & {
  timeWindow: ExactTimeWindow;
  result: ReturnType<typeof createExploreLogPersesResult>;
  display: ReturnType<typeof useLogView>;
  availableColumns: ReturnType<typeof availableLogColumns>;
};

export function LogResults(props: LogResultsProps) {
  const { data, query, timeWindow, display, availableColumns, evidenceCurrent, openPath } = props;
  const { t } = useTranslation();
  const copyLabels = logCopyLabels(t);
  return (
    <SignalResultFrame
      title={t('explore.signals.logs')}
      count={data.totalElements}
      leadingAction={<LogFacetVisibilityButton />}
      actions={
        <ExploreLogResultToolbar
          page={data}
          query={query}
          timeWindow={timeWindow}
          evidenceCurrent={evidenceCurrent}
          preferences={display.preferences}
          onPreferencesChange={display.onPreferencesChange}
          logColumns={display.logColumns}
          availableColumns={availableColumns}
          logOrder={props.logOrder}
          openPath={openPath}
          t={t}
        />
      }
    >
      <LogViewNotice display={display} />
      <LogResultRows {...props} copyLabels={copyLabels} />
    </SignalResultFrame>
  );
}

function logCopyLabels(t: import('i18next').TFunction) {
  return {
    copyOptions: t('explore.logCopy.copyOptions'),
    copied: t('explore.logCopy.copied'),
    menu: t('explore.logCopy.menu'),
    copyTimestamp: t('explore.logCopy.copyTimestamp'),
    copyTimestampDescription: t('explore.logCopy.copyTimestampDescription'),
    copyMessage: t('explore.logCopy.copyMessage'),
    copyMessageDescription: t('explore.logCopy.copyMessageDescription'),
    copyJson: t('explore.logCopy.copyJson'),
    copyJsonDescription: t('explore.logCopy.copyJsonDescription')
  };
}

function LogResultRows(props: LogResultsProps & { copyLabels: ReturnType<typeof logCopyLabels> }) {
  const { data, query, timeWindow, result, display, evidenceCurrent, openPath, copyLabels } = props;
  const rowMetadata = { calculated: props.calculated };
  const { t } = useTranslation();
  return data.totalElements === 0 ? (
    <SignalEmptyState
      title={t('explore.empty.logs')}
      hint={t('explore.recovery.logs')}
      reviewQueryLabel={t('explore.recovery.reviewQuery')}
    />
  ) : (
    <SelectablePersesLogTable
      renderLogContext={row => <ExploreLogContext {...{ row, query, timeWindow, evidenceCurrent }} />}
      logOrder={props.logOrder}
      rows={data.content}
      page={data}
      {...rowMetadata}
      logFilterDraft={props.logFilterDraft}
      logFilterScope={props.logFilterScope}
      logFilterPending={props.logFilterPending}
      onApplyLogFilters={props.onApplyLogFilters}
      onAddLogFilter={props.onAddLogFilter}
      onAnalyzeLogField={props.onAnalyzeLogField}
      logAnalysisDisabledReason={props.logAnalysisDisabledReason}
      query={query}
      timeWindow={timeWindow}
      runtimeIdentity={result.runtimeIdentity}
      persesQuery={result.query}
      persesOutcome={result.outcome}
      logDisplay={{
        ...display.preferences,
        copyLabels,
        onShowTimeChange: showTime => display.onPreferencesChange({ ...display.preferences, showTime }),
        onShowContentChange: showContent => display.onPreferencesChange({ ...display.preferences, showContent })
      }}
      logColumns={display.logColumns}
      evidenceCurrent={evidenceCurrent}
      openPath={openPath}
    />
  );
}
