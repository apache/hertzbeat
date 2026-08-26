/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Popover } from 'antd';
import type { TFunction } from 'i18next';
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';

import type {
  RuntimeCollectorsStatus,
  RuntimeStatusPresentation,
  RuntimeStatusRequestFailure,
  RuntimeStatusViewModel
} from '@/features/runtime-status';
import { settingsPaths } from '@/shared/settings/settings-routes';

import styles from './hertzbeat-shell-status.module.css';

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
        managementPath={settingsPaths.system}
        observedAt={snapshot.observedAt}
        status={snapshot.server}
        t={t}
      />
      <StatusSlot
        id="greptime"
        label={t('shell.status.greptime')}
        locale={locale}
        managementPath={settingsPaths.deployment}
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
        managementPath={settingsPaths.collectors}
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
        managementPath={settingsPaths.system}
        requestFailure={requestFailure}
        t={t}
      />
      <StatusSlot
        id="greptime"
        label={t('shell.status.greptime')}
        loading={loading}
        managementPath={settingsPaths.deployment}
        requestFailure={requestFailure}
        t={t}
      />
      <StatusSlot
        id="collector"
        label={t('shell.status.collector')}
        loading={loading}
        managementPath={settingsPaths.collectors}
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
  managementPath: string;
  observedAt?: string | null | undefined;
  requestFailure?: RuntimeStatusRequestFailure | undefined;
  status?: RuntimeStatusPresentation | undefined;
  t: TFunction;
};

function StatusSlot(props: StatusSlotProps) {
  const detailsId = useId();
  const [open, setOpen] = useState(false);
  const state = statusSlotState(props);
  const stateLabel = props.t(`shell.status.state.${state}`);
  const contextItems = statusContextItems(props);
  const context = contextItems.join(' · ');
  const description = `${props.label}: ${stateLabel} · ${context}`;
  return (
    <Popover
      content={
        <div
          className={styles.statusPopover}
          data-status={state}
          id={detailsId}
          role="dialog"
          aria-label={props.t('shell.status.details', { label: props.label })}
        >
          <div className={styles.statusPopoverHeader}>
            <strong>{props.label}</strong>
            <span>{stateLabel}</span>
          </div>
          <ul className={styles.statusPopoverEvidence}>
            {contextItems.map((item, index) => (
              <li key={`${props.id}-${index}`}>{item}</li>
            ))}
          </ul>
          <Link className={styles.statusPopoverLink} to={props.managementPath}>
            {props.t('shell.status.openManagement')}
          </Link>
        </div>
      }
      open={open}
      placement="bottomLeft"
      trigger="click"
      onOpenChange={setOpen}
    >
      <button
        className={styles.statusSlot}
        data-status={state}
        data-testid={`shell-status-${props.id}`}
        type="button"
        aria-controls={detailsId}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={description}
        title={description}
      >
        <span className={styles.statusDot} aria-hidden="true" />
        <span className={styles.statusLabel}>{props.label}</span>
        <small className={styles.statusValue}>{stateLabel}</small>
      </button>
    </Popover>
  );
}

function statusSlotState(props: StatusSlotProps) {
  if (props.loading) return 'loading';
  if (props.requestFailure) return 'unavailable';
  return props.status?.status ?? 'unavailable';
}

function statusContextItems(props: StatusSlotProps) {
  if (props.requestFailure) return [props.t(`shell.status.request.${props.requestFailure}`)];
  const observed = props.observedAt
    ? props.t('shell.status.currentStatusObservedAt', { time: formatObservedAt(props.observedAt, props.locale) })
    : null;
  const counts = collectorCountsContexts(props.collectorCounts, props.t);
  const collectorReport = collectorReportContext(props.lastReportedAt, props.collectorCounts, props.locale, props.t);
  const reason = statusReasonContext(props);
  const items = [observed, collectorReport, ...counts, reason].filter((item): item is string => Boolean(item));
  return items.length > 0 ? items : [props.t('shell.status.notObserved')];
}

function statusReasonContext(props: StatusSlotProps) {
  if (props.status?.errorCode === 'collector_status_unavailable') {
    const total = props.collectorCounts?.total;
    const online = props.collectorCounts?.online;
    if (total !== null && total !== undefined && online !== null && online !== undefined) {
      const offline = Math.max(0, total - online);
      if (offline > 0) return props.t('shell.status.collectorOfflineCount', { count: offline });
    }
  }
  return props.status?.errorCode ? props.t(`shell.status.reason.${props.status.errorCode}`) : null;
}

function collectorReportContext(
  lastReportedAt: string | null | undefined,
  counts: RuntimeCollectorsStatus | undefined,
  locale: string | undefined,
  t: TFunction
) {
  if (lastReportedAt === undefined) return null;
  if (lastReportedAt === null && counts?.online !== null && counts?.online !== undefined && counts.online > 0)
    return null;
  if (lastReportedAt === null) return t('shell.status.collectorNotReported');
  return t('shell.status.collectorLastReportedAt', { time: formatObservedAt(lastReportedAt, locale) });
}

function observedCollectorReportTime(collectors: RuntimeCollectorsStatus) {
  if (collectors.status === 'available' || collectors.status === 'degraded') return collectors.lastReportedAt;
  return undefined;
}

function collectorCountsContexts(counts: RuntimeCollectorsStatus | undefined, t: TFunction) {
  if (!counts || counts.total === null || counts.online === null || counts.runtimeHealthy === null) return [];
  return [
    t('shell.status.collectorOnlineCount', { total: counts.total, online: counts.online }),
    t('shell.status.collectorRuntimeHealthyCount', { count: counts.runtimeHealthy })
  ];
}

function formatObservedAt(value: string, locale: string | undefined) {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(
    Date.parse(value)
  );
}
