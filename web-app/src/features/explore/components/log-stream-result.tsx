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

import type { LogFilterFailureReason, LogSyntaxDiagnostic } from '../model/explore-log-filter-failure';

import { ExploreInvalidLogFilter } from './explore-invalid-log-filter';
import { Alert, Button } from 'antd';
import type { TFunction } from 'i18next';

import { LIVE_LOG_RETENTION_LIMIT, type LiveLogRow } from '../model/explore-signal-contract';
import type { LogExploreQuery } from '../model/explore-model';
import type { LiveLogStatus } from '../model/explore-signal-model';
import { LogRows, type LiveLogTableControls } from './log-rows';
import styles from './log-result.module.css';
import { SignalEmptyState, SignalResultFrame } from './signal-result-frame';

export type LiveLogView = {
  invalidFilterReason?: LogFilterFailureReason | undefined;
  syntaxDiagnostic?: LogSyntaxDiagnostic | undefined;
  rows: LiveLogRow[];
  status: LiveLogStatus;
  connectionStatus?: Exclude<LiveLogStatus, 'paused' | 'degraded'> | undefined;
  gapDroppedCount?: number | undefined;
  locallyDroppedCount?: number | undefined;
  pauseDisconnectGap?: boolean | undefined;
  togglePaused: () => void;
  retry: () => void;
  clear: () => void;
};

export function LogStreamResult({
  stream,
  query,
  t,
  navigate,
  ...controls
}: LiveLogTableControls & {
  stream: LiveLogView;
  query: LogExploreQuery;
  t: TFunction;
  navigate: (path: string) => void;
}) {
  const terminal = isTerminalStreamStatus(stream.status);
  const actions = <LogStreamActions stream={stream} t={t} />;
  const connection = (
    <StreamConnection
      status={stream.status === 'degraded' && stream.connectionStatus === 'waiting' ? 'waiting' : stream.status}
      t={t}
    />
  );

  return (
    <div>
      <StreamFailure stream={stream} t={t} />
      <StreamGapAlert stream={stream} t={t} />
      {(stream.locallyDroppedCount ?? 0) > 0 && (
        <p className={styles.retentionNotice} role="status">
          {t('exploreLog.localRetention', {
            retained: LIVE_LOG_RETENTION_LIMIT,
            dropped: stream.locallyDroppedCount
          })}
        </p>
      )}
      {stream.rows.length === 0 ? (
        <SignalResultFrame
          title={t('exploreLog.live')}
          count={0}
          meta={[{ label: t('exploreLog.streamStatus'), value: connection }]}
          actions={actions}
        >
          {terminal ? null : (
            <SignalEmptyState title={t('exploreLog.waiting')} hint={t('explore.liveFlow.incomingHint')} />
          )}
        </SignalResultFrame>
      ) : (
        <LogRows
          {...controls}
          rows={stream.rows}
          query={query}
          t={t}
          navigate={navigate}
          connection={connection}
          actions={actions}
        />
      )}
    </div>
  );
}

function StreamGapAlert({ stream, t }: { stream: LiveLogView; t: TFunction }) {
  const knownDrops = (stream.gapDroppedCount ?? 0) > 0;
  if (stream.status !== 'degraded' && !stream.pauseDisconnectGap && !knownDrops) return null;
  const gapMessage =
    stream.gapDroppedCount == null
      ? t('exploreLog.streamGap')
      : t('exploreLog.streamGapCount', { count: stream.gapDroppedCount });
  return (
    <Alert
      type="warning"
      showIcon
      message={stream.pauseDisconnectGap ? t('exploreLog.pauseDisconnectGap') : gapMessage}
      description={stream.pauseDisconnectGap && knownDrops ? gapMessage : undefined}
    />
  );
}

function LogStreamActions({ stream, t }: { stream: LiveLogView; t: TFunction }) {
  const terminal = isTerminalStreamStatus(stream.status);
  return (
    <div className={styles.streamActions}>
      <Button size="small" disabled={terminal} onClick={stream.togglePaused}>
        {t(stream.status === 'paused' ? 'exploreLog.resumeNewStream' : 'exploreLog.pauseDisconnect')}
      </Button>
      {terminal && stream.status !== 'invalid_filter' && stream.status !== 'permission' && (
        <Button size="small" onClick={stream.retry}>
          {t('common.retry')}
        </Button>
      )}
      <Button size="small" disabled={stream.rows.length === 0} onClick={stream.clear}>
        {t('exploreLog.clear')}
      </Button>
    </div>
  );
}

function isTerminalStreamStatus(status: LiveLogStatus) {
  return (
    status === 'unavailable' ||
    status === 'error' ||
    status === 'contract' ||
    status === 'invalid_filter' ||
    status === 'permission'
  );
}

function StreamConnection({ status, t }: { status: LiveLogStatus; t: TFunction }) {
  if (status === 'paused') return <span className={styles.paused}>{t('exploreLog.paused')}</span>;

  return (
    <span className={styles.streamConnection}>
      <i data-connected={status === 'connected' || status === 'degraded'} />
      {t(streamConnectionKey(status))}
    </span>
  );
}

function streamConnectionKey(status: LiveLogStatus) {
  switch (status) {
    case 'invalid_filter':
      return 'explore.logQueryBuilder.checkFilter';
    case 'permission':
      return 'common.permission.roleRequiredDescription';
    case 'unavailable':
      return 'common.unavailable';
    case 'error':
      return 'exploreLog.streamFailed';
    case 'contract':
      return 'explore.loadFailed';
    case 'degraded':
      return 'explore.liveFlow.connectedGap';
    case 'connected':
      return 'exploreLog.connected';
    case 'waiting':
    case 'paused':
      return 'exploreLog.connecting';
  }
}

function StreamFailure({ stream, t }: { stream: LiveLogView; t: TFunction }) {
  return (
    <>
      {stream.status === 'invalid_filter' && (
        <ExploreInvalidLogFilter
          retained={stream.rows.length > 0}
          invalidFilterReason={stream.invalidFilterReason}
          syntaxDiagnostic={stream.syntaxDiagnostic}
        />
      )}
      {stream.status === 'permission' && (
        <Alert type="error" showIcon message={t('common.permission.roleRequiredDescription')} />
      )}
      {stream.status === 'unavailable' && <Alert type="warning" showIcon message={t('common.unavailable')} />}
      {stream.status === 'error' && <Alert type="error" showIcon message={t('exploreLog.streamFailed')} />}
      {stream.status === 'contract' && <Alert type="error" showIcon message={t('explore.loadFailed')} />}
    </>
  );
}
