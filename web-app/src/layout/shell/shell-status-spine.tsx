/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { TFunction } from 'i18next';

import type {
  RuntimeCollectorsStatus,
  RuntimeStatusPresentation,
  RuntimeStatusRequestFailure,
  RuntimeStatusViewModel
} from '@/features/runtime-status';

import styles from './hertzbeat-shell.module.css';

export function ShellStatusSpine({
  locale,
  runtime,
  t
}: {
  locale: string | undefined;
  runtime: RuntimeStatusViewModel;
  t: TFunction;
}) {
  if (runtime.state === 'loading') return <UnobservedSpine loading t={t} />;
  if (runtime.state === 'request-failed') return <UnobservedSpine requestFailure={runtime.failure} t={t} />;
  const { snapshot } = runtime;
  return (
    <div className={styles.statusSpine} aria-label={t('shell.status.summary')}>
      <StatusSlot
        id="server"
        label={t('shell.status.server')}
        locale={locale}
        observedAt={snapshot.observedAt}
        status={snapshot.server}
        t={t}
      />
      <StatusSlot
        id="greptime"
        label={t('shell.status.greptime')}
        locale={locale}
        observedAt={snapshot.observedAt}
        status={snapshot.storage}
        t={t}
      />
      <StatusSlot
        collectorCounts={snapshot.collectors}
        id="collector"
        label={t('shell.status.collector')}
        lastReportedAt={observedCollectorReportTime(snapshot.collectors)}
        locale={locale}
        observedAt={snapshot.observedAt}
        status={snapshot.collectors}
        t={t}
      />
    </div>
  );
}

function UnobservedSpine({
  loading = false,
  requestFailure,
  t
}: {
  loading?: boolean;
  requestFailure?: RuntimeStatusRequestFailure | undefined;
  t: TFunction;
}) {
  return (
    <div className={styles.statusSpine} aria-label={t('shell.status.summary')}>
      <StatusSlot
        id="server"
        label={t('shell.status.server')}
        loading={loading}
        requestFailure={requestFailure}
        t={t}
      />
      <StatusSlot
        id="greptime"
        label={t('shell.status.greptime')}
        loading={loading}
        requestFailure={requestFailure}
        t={t}
      />
      <StatusSlot
        id="collector"
        label={t('shell.status.collector')}
        loading={loading}
        requestFailure={requestFailure}
        t={t}
      />
    </div>
  );
}

type StatusSlotProps = {
  collectorCounts?: RuntimeCollectorsStatus | undefined;
  id: string;
  label: string;
  loading?: boolean | undefined;
  lastReportedAt?: string | null | undefined;
  locale?: string | undefined;
  observedAt?: string | null | undefined;
  requestFailure?: RuntimeStatusRequestFailure | undefined;
  status?: RuntimeStatusPresentation | undefined;
  t: TFunction;
};

function StatusSlot(props: StatusSlotProps) {
  const state = statusSlotState(props);
  const stateLabel = props.t(`shell.status.state.${state}`);
  const context = statusContext(props);
  return (
    <div
      className={styles.statusSlot}
      data-status={state}
      data-testid={`shell-status-${props.id}`}
      title={`${props.label}: ${stateLabel} · ${context}`}
    >
      <span className={styles.statusDot} aria-hidden="true" />
      <span className={styles.statusLabel}>{props.label}</span>
      <small className={styles.statusValue}>
        {stateLabel} · {context}
      </small>
    </div>
  );
}

function statusSlotState(props: StatusSlotProps) {
  if (props.loading) return 'loading';
  if (props.requestFailure) return 'unavailable';
  return props.status?.status ?? 'unavailable';
}

function statusContext(props: StatusSlotProps) {
  if (props.requestFailure) return props.t(`shell.status.request.${props.requestFailure}`);
  const observed = props.observedAt
    ? props.t('shell.status.snapshotObservedAt', { time: formatObservedAt(props.observedAt, props.locale) })
    : null;
  const collectorReport = collectorReportContext(props.lastReportedAt, props.locale, props.t);
  const counts = collectorCountsContext(props.collectorCounts, props.t);
  const reason = props.status?.errorCode ? props.t(`shell.status.reason.${props.status.errorCode}`) : null;
  return [observed, collectorReport, counts, reason].filter(Boolean).join(' · ') || props.t('shell.status.notObserved');
}

function collectorReportContext(lastReportedAt: string | null | undefined, locale: string | undefined, t: TFunction) {
  if (lastReportedAt === undefined) return null;
  if (lastReportedAt === null) return t('shell.status.collectorNotReported');
  return t('shell.status.collectorLastReportedAt', { time: formatObservedAt(lastReportedAt, locale) });
}

function observedCollectorReportTime(collectors: RuntimeCollectorsStatus) {
  if (collectors.status === 'available' || collectors.status === 'degraded') return collectors.lastReportedAt;
  return undefined;
}

function collectorCountsContext(counts: RuntimeCollectorsStatus | undefined, t: TFunction) {
  if (!counts || counts.total === null || counts.online === null || counts.runtimeHealthy === null) return null;
  return t('shell.status.collectorCounts', {
    total: counts.total,
    online: counts.online,
    runtimeHealthy: counts.runtimeHealthy
  });
}

function formatObservedAt(value: string, locale: string | undefined) {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(
    Date.parse(value)
  );
}
