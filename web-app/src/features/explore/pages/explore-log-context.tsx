/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { ExactTimeWindow } from '@/shared/query-context';
import { useLogInvestigationController } from '../controller/use-log-investigation-controller';
import { ExploreLogContextPane } from '../components/explore-log-context-pane';
import type { LogExploreQuery } from '../model/explore-query';
import type { LogRow } from '../model/explore-signal-contract';
export function ExploreLogContext({
  query,
  row,
  timeWindow,
  evidenceCurrent
}: {
  query: LogExploreQuery;
  row: LogRow;
  timeWindow: ExactTimeWindow;
  evidenceCurrent: boolean;
}) {
  const controller = useLogInvestigationController({
    ...query,
    logRecordUid: evidenceCurrent ? (row.logRecordUid ?? undefined) : undefined,
    start: timeWindow.from,
    end: timeWindow.to,
    timeZone: query.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    live: false,
    traceId: undefined,
    spanId: undefined
  });
  return (
    <ExploreLogContextPane
      state={controller.state}
      current={controller.evidenceCurrent}
      evidenceCurrent={evidenceCurrent}
      timeZone={query.timeZone}
      onRetry={() => void controller.refetch()}
    />
  );
}
