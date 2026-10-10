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
import { useTranslation } from 'react-i18next';
import type { TraceLoad } from '../model/explore-trace-analytics';
import styles from './explore-trace-population.module.css';
const stateKeys = {
  idle: 'exploreTrace.analytics.unavailable',
  ready: 'exploreTrace.analytics.unavailable',
  error: 'exploreTrace.analytics.unavailable',
  permission: 'common.permission.roleRequiredDescription',
  loading: 'explore.states.refreshing'
};
export function TraceAnalyticsState({ load, retry }: { load: TraceLoad<{ state: string }>; retry: () => void }) {
  const { t } = useTranslation();
  if (load.state === 'idle' || (load.state === 'ready' && load.data?.state === 'ready')) return null;
  const retained = load.data?.state === 'ready' && ['loading', 'error'].includes(load.state);
  const key = retained
    ? load.state === 'loading'
      ? 'explore.logFacets.refreshing'
      : 'explore.logFacets.stale'
    : stateKeys[load.state];
  return (
    <p className={styles.hint} role={load.state === 'error' ? 'alert' : 'status'}>
      {t(key)}
      {load.state === 'error' && (
        <Button size="small" onClick={retry}>
          {t('common.retry')}
        </Button>
      )}
    </p>
  );
}
export function TraceCoverage({
  coverage
}: {
  coverage: { mode: string; rowLimit: number | null; truncated: boolean } | null;
}) {
  const { t } = useTranslation();
  return coverage?.mode === 'bounded' ? (
    <p className={styles.hint}>
      {t('exploreTrace.analytics.bounded', { limit: coverage.rowLimit })}
      {coverage.truncated && ` ${t('exploreTrace.analytics.truncated')}`}
    </p>
  ) : null;
}
