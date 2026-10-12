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

import { Button } from 'antd';
import type { TFunction } from 'i18next';
import { LogQuerySetEvidence, type LogQuerySetResult } from '@/platform/perses';
import type { LogQuerySet } from '@/platform/perses';
import { ExploreLogIntervalFailure } from './explore-log-interval-controls';
import styles from './explore-log-analysis.module.css';

export function ExploreLogQuerySetResult({
  load,
  t,
  onUseAuto,
  formulaFunctions
}: {
  load: {
    state: 'idle' | 'loading' | 'ready' | 'error' | 'permission' | 'unavailable' | 'interval_too_small';
    data: LogQuerySetResult | undefined;
    retry: () => void;
  };
  t: TFunction;
  onUseAuto?: (() => void) | undefined;
  formulaFunctions?: LogQuerySet['formulas'] | undefined;
}) {
  if (load.state === 'idle') return null;
  if (load.state === 'interval_too_small') return <ExploreLogIntervalFailure t={t} onUseAuto={onUseAuto} />;
  return (
    <section className={styles.result} aria-label={t('explore.logAnalysis.label')}>
      {load.state === 'ready' && load.data ? (
        <LogQuerySetEvidence data={load.data} t={t} formulaFunctions={formulaFunctions} />
      ) : (
        <div role="status" className={styles.state}>
          <p>
            {t(
              `explore.logAnalysis.${load.state === 'loading' ? 'loading' : load.state === 'permission' ? 'permission' : load.state === 'unavailable' ? 'unavailable' : 'error'}`
            )}
          </p>
          {load.state !== 'loading' && <Button onClick={load.retry}>{t('common.retry')}</Button>}
        </div>
      )}
    </section>
  );
}
