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
