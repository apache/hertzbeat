/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  BellOutlined,
  BgColorsOutlined,
  GlobalOutlined,
  LogoutOutlined,
  ReloadOutlined,
  UserOutlined
} from '@ant-design/icons';
import { Avatar, Button, Dropdown, Tooltip } from 'antd';
import type { TFunction } from 'i18next';
import type { ReactNode } from 'react';

import type { RuntimeComponentStatus, RuntimeStatusErrorCode, RuntimeStatusViewModel } from '@/features/runtime-status';

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
  if (runtime.state === 'loading') {
    return (
      <div className={styles.statusSpine} aria-label={t('shell.status.summary')}>
        <StatusSlot id="server" label={t('shell.status.server')} loading t={t} />
        <StatusSlot id="greptime" label={t('shell.status.greptime')} loading t={t} />
        <StatusSlot id="collector" label={t('shell.status.collector')} loading t={t} />
      </div>
    );
  }
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
        id="collector"
        label={t('shell.status.collector')}
        lastReportedAt={snapshot.collectors.lastReportedAt}
        locale={locale}
        observedAt={snapshot.observedAt}
        status={snapshot.collectors}
        t={t}
      />
    </div>
  );
}

type ShellHeaderActionsProps = {
  accountName: string;
  loggingOut: boolean;
  showRefresh: boolean;
  t: TFunction;
  onRefresh: () => void;
  onOpenAlerts: () => void;
  onToggleTheme: () => void;
  onChangeLanguage: () => void;
  onLogout: () => void;
};

export function ShellHeaderActions({
  accountName,
  loggingOut,
  showRefresh,
  t,
  onRefresh,
  onOpenAlerts,
  onToggleTheme,
  onChangeLanguage,
  onLogout
}: ShellHeaderActionsProps) {
  return (
    <div className={styles.headerActions}>
      {showRefresh && <HeaderAction label={t('shell.actions.refresh')} icon={<ReloadOutlined />} onClick={onRefresh} />}
      <HeaderAction label={t('shell.actions.alerts')} icon={<BellOutlined />} onClick={onOpenAlerts} />
      <HeaderAction label={t('shell.actions.theme')} icon={<BgColorsOutlined />} onClick={onToggleTheme} />
      <HeaderAction label={t('shell.actions.language')} icon={<GlobalOutlined />} onClick={onChangeLanguage} />
      <Dropdown
        trigger={['click']}
        menu={{
          items: [{ key: 'logout', icon: <LogoutOutlined />, label: t('auth.logout'), disabled: loggingOut }],
          onClick: onLogout
        }}
      >
        <Button className={styles.accountButton ?? ''} type="text" aria-label={t('shell.actions.user')}>
          <Avatar size={24} icon={!accountName ? <UserOutlined /> : undefined}>
            {accountName.slice(0, 1).toUpperCase()}
          </Avatar>
          <span>{accountName}</span>
        </Button>
      </Dropdown>
    </div>
  );
}

type StatusSlotProps = {
  id: string;
  label: string;
  loading?: boolean;
  lastReportedAt?: string | null | undefined;
  locale?: string | undefined;
  observedAt?: string | null | undefined;
  status?: RuntimeComponentStatus | undefined;
  t: TFunction;
};

function StatusSlot({ id, label, loading = false, lastReportedAt, locale, observedAt, status, t }: StatusSlotProps) {
  const state = loading ? 'loading' : (status?.status ?? 'unavailable');
  const stateLabel = t(`shell.status.state.${state}`);
  const context = statusContext(observedAt, lastReportedAt, status?.errorCode ?? null, locale, t);
  return (
    <div
      className={styles.statusSlot}
      data-status={state}
      data-testid={`shell-status-${id}`}
      title={`${label}: ${stateLabel} · ${context}`}
    >
      <span className={styles.statusDot} aria-hidden="true" />
      <span className={styles.statusLabel}>{label}</span>
      <small className={styles.statusValue}>
        {stateLabel} · {context}
      </small>
    </div>
  );
}

function statusContext(
  observedAt: string | null | undefined,
  lastReportedAt: string | null | undefined,
  errorCode: RuntimeStatusErrorCode | null,
  locale: string | undefined,
  t: TFunction
) {
  const observed = observedAt
    ? t('shell.status.snapshotObservedAt', { time: formatObservedAt(observedAt, locale) })
    : null;
  const collectorReport = collectorReportContext(lastReportedAt, locale, t);
  const reason = errorCode ? t(`shell.status.reason.${errorCode}`) : null;
  return [observed, collectorReport, reason].filter(Boolean).join(' · ') || t('shell.status.notObserved');
}

function collectorReportContext(lastReportedAt: string | null | undefined, locale: string | undefined, t: TFunction) {
  if (lastReportedAt === undefined) return null;
  if (lastReportedAt === null) return t('shell.status.collectorNotReported');
  return t('shell.status.collectorLastReportedAt', { time: formatObservedAt(lastReportedAt, locale) });
}

function formatObservedAt(value: string, locale: string | undefined) {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(
    Date.parse(value)
  );
}

function HeaderAction({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <Tooltip title={label}>
      <Button className={styles.headerAction ?? ''} type="text" aria-label={label} icon={icon} onClick={onClick} />
    </Tooltip>
  );
}
