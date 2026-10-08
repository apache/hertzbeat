import { TraceGroupRows } from '@/platform/perses';
/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { SignalEmptyState } from './signal-result-frame';
import { useTranslation } from 'react-i18next';
import type { TraceGroups, TraceLoad } from '../model/explore-trace-analytics';
import { TraceAnalyticsState, TraceCoverage } from './explore-trace-analytics-state';
import styles from './explore-trace-population.module.css';
export function ExploreTraceGroups({
  load,
  retry,
  onGroup
}: {
  load: TraceLoad<TraceGroups>;
  retry: () => void;
  onGroup: ((value: string) => void) | undefined;
}) {
  const { t } = useTranslation(),
    result = ['permission', 'idle'].includes(load.state) ? undefined : load.data,
    data = result?.state === 'ready' ? result.data : null;
  return (
    <div className={styles.result}>
      <TraceAnalyticsState load={load} retry={retry} />
      {result && <TraceCoverage coverage={result.coverage} />}
      {data && (
        <>
          {data.membership === 'multiple' && <p className={styles.hint}>{t('exploreTrace.analytics.membership')}</p>}
          {!data.groups.length && (
            <SignalEmptyState
              title={t('exploreTrace.analytics.empty')}
              hint={t('explore.recovery.traces')}
              reviewQueryLabel={t('explore.recovery.reviewQuery')}
            />
          )}
          {onGroup && data.groups.length > 0 && <p className={styles.hint}>{t('exploreTrace.layout.groupAction')}</p>}
          <TraceGroupRows data={data} enabled={load.state === 'ready'} onGroup={onGroup} />
          {data.truncated && <p className={styles.hint}>{t('exploreTrace.analytics.topValues')}</p>}
        </>
      )}
    </div>
  );
}
