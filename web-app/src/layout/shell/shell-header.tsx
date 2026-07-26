/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { ClockCircleOutlined } from '@ant-design/icons';
import { Button, Dropdown, type MenuProps } from 'antd';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { useSession } from '@/core/auth/session-context';
import { useShellAlertNotificationController } from '@/features/alert/shell';
import { useShellMonitorImportTaskNotifications } from '@/features/monitor/shell';
import { useRuntimeStatusController } from '@/features/runtime-status';
import { globalAutoRefreshValues, globalTimeRanges, type GlobalTimeRange, type SharedTimeValue } from '@/shared/time';

import styles from './hertzbeat-shell.module.css';
import { ShellHeaderActions, ShellStatusSpine } from './shell-header-presentation';
import { useShellHeaderActionController } from './use-shell-header-action-controller';

export function ShellHeader({ collapsed }: { collapsed: boolean }) {
  const { t, i18n } = useTranslation();
  const { session } = useSession();
  const location = useLocation();
  const actions = useShellHeaderActionController();
  useShellMonitorImportTaskNotifications();
  const alertNotifications = useShellAlertNotificationController({
    locale: i18n.resolvedLanguage,
    notificationTitle: t('shell.alerts.browserTitle'),
    notificationBody: t('shell.alerts.browserBody'),
    onOpenAlerts: actions.openAlerts
  });
  const runtimeStatus = useRuntimeStatusController();
  const accountName = session?.username ?? '';

  return (
    <header className={styles.header}>
      <div className={styles.brandSlot}>
        <img className={styles.brandLogo} src="/assets/logo.svg" alt="HertzBeat" width={24} height={23} />
        {!collapsed && (
          <strong className={styles.brandName} aria-hidden="true">
            HertzBeat
          </strong>
        )}
      </div>
      <div className={styles.headerSpine}>
        <ShellStatusSpine locale={i18n.resolvedLanguage} runtime={runtimeStatus} t={t} />
        <ShellTimeControl time={actions.sharedTime} t={t} locale={i18n.resolvedLanguage} />
        <ShellHeaderActions
          accountName={accountName}
          alertNotifications={alertNotifications}
          loggingOut={actions.loggingOut}
          showRefresh={actions.sharedTime.policy !== 'unknown'}
          t={t}
          onRefresh={() => void actions.refresh()}
          onOpenAlerts={actions.openAlerts}
          onToggleTheme={actions.toggleTheme}
          onChangeLanguage={() => void actions.changeLanguage()}
          onLock={() => {
            if (session) actions.lock(session, `${location.pathname}${location.search}${location.hash}`);
          }}
          onLogout={() => void actions.logout()}
        />
      </div>
    </header>
  );
}

function ShellTimeControl({ time, t, locale }: { time: SharedTimeValue; t: TFunction; locale: string | undefined }) {
  if (time.headerMode === 'hidden' || !time.window) return null;
  if (time.headerMode === 'exact_window') {
    return (
      <div className={styles.timePolicy} data-testid="shell-time-policy">
        <ClockCircleOutlined aria-hidden="true" />
        <span>{formatExactWindow(time.window, locale)}</span>
      </div>
    );
  }
  const items = globalTimeMenuItems(time, t);
  return (
    <Dropdown menu={{ items, onClick: info => updateGlobalTime(time, info.key) }} trigger={['click']}>
      <Button className={styles.timePolicy ?? ''} data-testid="shell-time-policy" type="text">
        <ClockCircleOutlined aria-hidden="true" />
        <span>{globalTimeLabel(time, t)}</span>
      </Button>
    </Dropdown>
  );
}

function globalTimeMenuItems(time: SharedTimeValue, t: TFunction): NonNullable<MenuProps['items']> {
  return [
    ...globalTimeRanges.map(range => ({
      key: `range:${range}`,
      label: t('shell.time.rangeOption', { range }),
      disabled: time.range === range
    })),
    { type: 'divider' as const },
    ...globalAutoRefreshValues.map(interval => ({
      key: `refresh:${interval}`,
      label:
        interval === 0
          ? t('shell.time.autoRefreshOff')
          : t('shell.time.autoRefreshSeconds', { seconds: interval / 1_000 }),
      disabled: time.autoRefreshMs === interval
    }))
  ];
}

function updateGlobalTime(time: SharedTimeValue, key: string) {
  if (key.startsWith('range:')) time.setRange(key.slice(6) as GlobalTimeRange);
  if (key.startsWith('refresh:')) time.setAutoRefresh(Number(key.slice(8)));
}

function globalTimeLabel(time: SharedTimeValue, t: TFunction) {
  if (time.autoRefreshMs <= 0 || time.remainingMs == null) {
    return t('shell.time.globalLabel', { range: time.range, refresh: t('shell.time.off') });
  }
  return t('shell.time.globalLabel', {
    range: time.range,
    refresh: t('shell.time.remaining', { seconds: Math.ceil(time.remainingMs / 1_000) })
  });
}

function formatExactWindow(window: { from: number; to: number }, locale: string | undefined) {
  const formatter = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${formatter.format(window.from)} – ${formatter.format(window.to)}`;
}
