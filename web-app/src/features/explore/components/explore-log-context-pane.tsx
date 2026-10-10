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

import { logSeverityLabel } from '@/shared/log-severity';
import { logSummary } from '@/shared/log-summary';
import { Button } from 'antd';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  LogInvestigationViewState,
  LogInvestigationSnapshot,
  InvestigationLogRecord
} from '../model/explore-investigation-contract';
import styles from './explore-log-context-pane.module.css';
type Props = {
  state: LogInvestigationViewState;
  current: boolean;
  evidenceCurrent: boolean;
  onRetry: () => void;
  timeZone: string | undefined;
};
export function ExploreLogContextPane({ state, current, evidenceCurrent, onRetry, timeZone }: Props) {
  const { t } = useTranslation();
  if (!evidenceCurrent) return <p role="status">{t('explore.logContext.staleHint')}</p>;
  const loading = evidenceCurrent && (state.kind === 'loading' || (state.kind === 'ready' && !current));
  return (
    <section className={styles.context} aria-label={t('explore.logContext.title')}>
      <p className={styles.scope}>{t('explore.logContext.scopeHint')}</p>
      {loading ? (
        <p role="status">{t('explore.logContext.loading')}</p>
      ) : state.kind === 'ready' && evidenceCurrent ? (
        <ContextRows snapshot={state.snapshot} timeZone={timeZone} />
      ) : (
        <p role="alert">
          {t(state.kind === 'invalid' ? 'explore.logContext.invalid' : 'explore.logContext.unavailable')}{' '}
          <Button onClick={onRetry}>{t('explore.logContext.retry')}</Button>
        </p>
      )}
    </section>
  );
}
function ContextRows({ snapshot, timeZone }: { snapshot: LogInvestigationSnapshot; timeZone: string | undefined }) {
  const { t } = useTranslation();
  const { selectedLog, nearbyLogs } = snapshot;
  const anchorRef = useRef<HTMLLIElement>(null);
  const anchorUid = selectedLog.log?.logRecordUid;
  useEffect(() => {
    anchorRef.current?.scrollIntoView?.({ block: 'center' });
  }, [anchorUid]);
  if (selectedLog.state !== 'ready' || !selectedLog.log)
    return (
      <p role="status">
        {t(selectedLog.state === 'empty' ? 'explore.logContext.empty' : 'explore.logContext.unavailable')}
      </p>
    );
  const anchor = selectedLog.log;
  const rows =
    nearbyLogs.state === 'ready' ? [...nearbyLogs.before, anchor, ...nearbyLogs.after].sort(compareLogs) : [anchor];
  return (
    <>
      {nearbyLogs.state === 'unavailable' && (
        <p role="alert">
          {t(
            nearbyLogs.reason === 'identity_unavailable'
              ? 'explore.logContext.identityUnavailable'
              : 'explore.logContext.unavailable'
          )}
        </p>
      )}
      {nearbyLogs.hasMoreBefore && <p className={styles.bound}>{t('explore.logContext.moreBefore')}</p>}
      <ol className={styles.rows}>
        {rows.map(row => (
          <li
            key={row.logRecordUid}
            ref={row.logRecordUid === anchor.logRecordUid ? anchorRef : undefined}
            data-context-anchor={row.logRecordUid === anchor.logRecordUid ? 'true' : undefined}
          >
            <div className={styles.meta}>
              <time dateTime={new Date(Number(BigInt(row.timeUnixNano) / 1000000n)).toISOString()}>
                {formatTime(row, timeZone)}
              </time>
              <span>{logSeverityLabel(row) ?? '—'}</span>
              {row.logRecordUid === anchor.logRecordUid && <strong>{t('explore.logContext.anchor')}</strong>}
            </div>
            <p>{logSummary(row.body) ?? '—'}</p>
          </li>
        ))}
      </ol>
      {nearbyLogs.hasMoreAfter && <p className={styles.bound}>{t('explore.logContext.moreAfter')}</p>}
      {nearbyLogs.state === 'empty' && <p role="status">{t('explore.logContext.empty')}</p>}
    </>
  );
}
function compareLogs(a: InvestigationLogRecord, b: InvestigationLogRecord) {
  const left = BigInt(a.timeUnixNano),
    right = BigInt(b.timeUnixNano);
  return left < right
    ? -1
    : left > right
      ? 1
      : a.logRecordUid < b.logRecordUid
        ? -1
        : a.logRecordUid > b.logRecordUid
          ? 1
          : 0;
}
function formatTime(row: InvestigationLogRecord, timeZone: string | undefined) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
    timeZone
  }).format(Number(BigInt(row.timeUnixNano) / 1000000n));
}
