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

import type { TFunction } from 'i18next';

import type { MetricResultDisplay } from './metric-result-display';
import { useEvidenceCopy } from './explore-evidence-copy';
import styles from './metric-ready-result.module.css';

export function MetricResultToolbar({
  received,
  display,
  onDisplayChange,
  t
}: {
  received: number;
  display: MetricResultDisplay;
  onDisplayChange: (display: MetricResultDisplay) => void;
  t: TFunction;
}) {
  return (
    <div className={styles.toolbar}>
      <span className={styles.count}>{t('exploreMetric.receivedSamples', { count: received })}</span>
      <div className={styles.display} role="group" aria-label={t('exploreMetric.resultDisplay')}>
        {(['chart', 'table'] as const).map(mode => (
          <button key={mode} type="button" aria-pressed={display === mode} onClick={() => onDisplayChange(mode)}>
            {t(`exploreMetric.${mode}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MetricExecutedQuery({ query, t }: { query: string | null; t: TFunction }) {
  const { copy, status, sequence } = useEvidenceCopy(query ?? '');
  if (!query) return null;
  return (
    <details className={styles.disclosure}>
      <summary>{t('exploreMetric.responseQuery')}</summary>
      <div className={styles.queryActions}>
        <button
          type="button"
          onClick={() => {
            void copy();
          }}
        >
          {t('exploreMetric.copyQuery')}
        </button>
        <span role="status" aria-live="polite" aria-atomic="true" aria-label={t('explore.perses.copyStatus')}>
          {status !== 'idle' && (
            <span key={sequence}>
              {t(status === 'copied' ? 'exploreMetric.queryCopied' : 'exploreMetric.queryCopyFailed')}
            </span>
          )}
        </span>
      </div>
      <pre tabIndex={0} aria-label={t('exploreMetric.responseQuery')}>
        {query}
      </pre>
    </details>
  );
}
