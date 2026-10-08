/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { ZodError } from 'zod';
import { ExploreSignalContractError } from '@/shared/signal-contract-error';
import type { HertzBeatLogAnalysisQuery, HertzBeatQueryOutcome } from '../datasource/hertzbeat-query-contract';
import { HertzBeatResponseContractError } from '../datasource/hertzbeat-query-schema';
import type { LogAnalysisResult } from './log-analysis';
import type { LogComparisonResult } from './log-comparison-result';
import { logAnalysisPath, loadLogAnalysis } from './log-analysis-client';
import { logComparisonRequest, loadLogComparison } from './log-comparison-client';
import { logQuerySetRequest, loadLogQuerySet } from './log-query-set-client';
import type { LogQuerySetResult } from './log-query-set-result';
export type LogAnalysisEvidence =
  | { kind: 'single'; data: LogAnalysisResult }
  | { kind: 'comparison'; data: LogComparisonResult }
  | { kind: 'querySet'; data: LogQuerySetResult };
export async function queryLogAnalysis(
  query: HertzBeatLogAnalysisQuery,
  params: URLSearchParams,
  signal?: AbortSignal
): Promise<HertzBeatQueryOutcome<LogAnalysisEvidence>> {
  try {
    const { analysis, timeWindow } = query;
    const evidence: LogAnalysisEvidence = analysis.querySet
      ? {
          kind: 'querySet',
          data: await loadLogQuerySet(logQuerySetRequest(params, timeWindow, analysis), timeWindow, analysis, signal)
        }
      : analysis.comparison?.search !== undefined
        ? {
            kind: 'comparison',
            data: await loadLogComparison(
              logComparisonRequest(params, timeWindow, analysis),
              timeWindow,
              analysis,
              signal
            )
          }
        : {
            kind: 'single',
            data: await loadLogAnalysis(logAnalysisPath(params, analysis), timeWindow, analysis, signal)
          };
    return {
      state: 'ready',
      data: evidence,
      truncated:
        evidence.kind === 'querySet' ? evidence.data.sources.some(source => source.truncated) : evidence.data.truncated
    };
  } catch (error) {
    if (error instanceof ZodError || error instanceof ExploreSignalContractError)
      throw new HertzBeatResponseContractError();
    throw error;
  }
}
