/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
