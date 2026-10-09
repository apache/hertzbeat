/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useTranslation } from 'react-i18next';
import {
  LogAnalysisEvidenceView,
  type HertzBeatLogAnalysisQuery,
  type HertzBeatQueryOutcome,
  type LogAnalysisEvidence,
  type HertzBeatPersesPrimitiveMessages
} from '@/platform/perses';
export function DashboardLogAnalysis({
  query,
  display,
  outcome,
  timeZone,
  messages
}: {
  display?: 'line' | 'bar' | undefined;
  query: HertzBeatLogAnalysisQuery;
  outcome: HertzBeatQueryOutcome<LogAnalysisEvidence>;
  timeZone?: string | undefined;
  messages: HertzBeatPersesPrimitiveMessages;
}) {
  const { t } = useTranslation();
  if (outcome.state === 'error') return <p role="alert">{messages.failures[outcome.error.messageKey]}</p>;
  if (outcome.state === 'empty') return <p role="status">{messages.empty}</p>;
  return (
    <LogAnalysisEvidenceView
      evidence={outcome.data}
      display={display}
      representation={query.analysis.representation}
      comparison={query.analysis.comparison}
      t={t}
      timeZone={timeZone}
    />
  );
}
