/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useTranslation } from 'react-i18next';
import type { MetricQueryRow } from '@/platform/perses';
import styles from './explore-metric-plan-editor.module.css';

export function MetricRowHints({ row }: { row: MetricQueryRow }) {
  const { t } = useTranslation();
  return (
    <details className={styles.syntaxHelp}>
      <summary>{t('explore.metricComposition.queryHelp')}</summary>
      <p className={styles.hint}>{t('exploreMetric.identityGroupingHint')}</p>
      <p className={styles.hint}>{t('explore.metricComposition.scopeHint')}</p>
      {row.rollup && !row.nestedRollup && <p className={styles.hint}>{t('exploreMetric.rollupHint')}</p>}
      {row.nestedRollup && <p className={styles.hint}>{t('exploreMetric.nestedRollupHint')}</p>}
      {row.temporalAggregation && row.temporalAggregation !== 'raw' && (
        <p className={styles.hint}>{t('exploreMetric.temporalWindowHint')}</p>
      )}
      {row.aggregation === 'count' && <p className={styles.hint}>{t('exploreMetric.countSeriesHint')}</p>}
    </details>
  );
}
