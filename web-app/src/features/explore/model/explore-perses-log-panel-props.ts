/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { ExactTimeWindow } from '@/shared/query-context';
import type { LogInspectorAnalysisControls } from './explore-log-inspector-analysis';
import type { LogInspectorFilterControls } from './explore-log-inspector-filter';
import type { LogSortControls } from './explore-log-order';
import type { LogExploreQuery } from './explore-model';
import type { LogHistoryEvidence } from './explore-signal-contract';

export type ExplorePersesLogPanelProps = LogInspectorFilterControls &
  LogInspectorAnalysisControls & {
    logOrder?: LogSortControls | undefined;
    data: LogHistoryEvidence['page'];
    calculated?: LogHistoryEvidence['calculated'];
    statistics: Pick<LogHistoryEvidence, 'overview' | 'trend'>;
    query: LogExploreQuery;
    openPath: (path: string) => void;
    timeWindow: ExactTimeWindow | undefined;
    revision: number;
    evidenceCurrent: boolean;
    showTrend?: boolean | undefined;
  };
