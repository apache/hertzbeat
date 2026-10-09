/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
  const { data, query, timeWindow, result, display, availableColumns, evidenceCurrent, openPath } = props;
  const rowMetadata = { calculated: props.calculated };
  const { t } = useTranslation();
  const copyLabels = {
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
      {data.totalElements === 0 ? (
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
      )}
    </SignalResultFrame>
  );
}
