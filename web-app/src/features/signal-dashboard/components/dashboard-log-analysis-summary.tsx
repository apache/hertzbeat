/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useTranslation } from 'react-i18next';
import { logGroupingFieldLabel, type LogAnalysisState } from '@/platform/perses';
export function DashboardLogAnalysisSummary({ analysis }: { analysis: LogAnalysisState }) {
  const { t } = useTranslation();
  return (
    <div>
      <strong>{t(`explore.logAnalysis.${analysis.representation}`)}</strong>
      <p>
        {analysis.grouping
          ? analysis.grouping.dimensions.map(item => logGroupingFieldLabel(item.field, t)).join(' / ')
          : analysis.field
            ? logGroupingFieldLabel(analysis.field, t)
            : t('explore.logAnalysis.everything')}
      </p>
      {analysis.measure && (
        <p>
          {t(`explore.logAnalysis.${analysis.measure.function}`)} · {logGroupingFieldLabel(analysis.measure.field, t)}
        </p>
      )}
      {analysis.comparison && (
        <p>
          {t('explore.logComparison.label')}
          {analysis.comparison.formula ? ` · ${analysis.comparison.formula}` : ''}
        </p>
      )}
      <p>{t('signalDashboard.analysisReadOnly')}</p>
    </div>
  );
}
