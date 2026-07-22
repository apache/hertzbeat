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

import { Alert, Button } from 'antd';
import type { TFunction } from 'i18next';

import type { LogRow } from '../model/explore-signal-contract';
import type { LogExploreQuery } from '../model/explore-model';
import type { LiveLogStatus } from '../model/explore-signal-model';
import { LogRows } from './log-rows';
import styles from './log-result.module.css';
import { SignalEmptyState, SignalResultFrame } from './signal-result-frame';

export type LiveLogView = {
  rows: LogRow[];
  status: LiveLogStatus;
  togglePaused: () => void;
  clear: () => void;
};

export function LogStreamResult({
  stream,
  query,
  t,
  navigate
}: {
  stream: LiveLogView;
  query: LogExploreQuery;
  t: TFunction;
  navigate: (path: string) => void;
}) {
  const actions = (
    <div className={styles.streamActions}>
      <Button size="small" onClick={stream.togglePaused}>
        {t(stream.status === 'paused' ? 'exploreLog.resume' : 'exploreLog.pause')}
      </Button>
      <Button size="small" disabled={stream.rows.length === 0} onClick={stream.clear}>
        {t('exploreLog.clear')}
      </Button>
    </div>
  );
  const connection = <StreamConnection status={stream.status} t={t} />;

  return (
    <div>
      {stream.status === 'unavailable' && <Alert type="warning" showIcon message={t('common.unavailable')} />}
      {stream.status === 'error' && <Alert type="error" showIcon message={t('exploreLog.streamFailed')} />}
      {stream.status === 'contract' && <Alert type="error" showIcon message={t('explore.loadFailed')} />}
      {stream.rows.length === 0 ? (
        <SignalResultFrame
          title={t('exploreLog.live')}
          count={0}
          meta={[{ label: t('exploreLog.streamStatus'), value: connection }]}
          actions={actions}
        >
          <SignalEmptyState title={t('exploreLog.waiting')} hint={t('explore.description')} />
        </SignalResultFrame>
      ) : (
        <LogRows
          rows={stream.rows}
          query={query}
          t={t}
          navigate={navigate}
          live
          connection={connection}
          actions={actions}
        />
      )}
    </div>
  );
}

function StreamConnection({ status, t }: { status: LiveLogStatus; t: TFunction }) {
  if (status === 'paused') return <span className={styles.paused}>{t('exploreLog.paused')}</span>;

  return (
    <span className={styles.streamConnection}>
      <i data-connected={status === 'connected'} />
      {t(streamConnectionKey(status))}
    </span>
  );
}

function streamConnectionKey(status: LiveLogStatus) {
  switch (status) {
    case 'unavailable':
      return 'common.unavailable';
    case 'error':
      return 'exploreLog.streamFailed';
    case 'contract':
      return 'explore.loadFailed';
    case 'connected':
      return 'exploreLog.connected';
    case 'waiting':
    case 'paused':
      return 'exploreLog.connecting';
  }
}
