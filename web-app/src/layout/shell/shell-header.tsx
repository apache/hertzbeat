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
import { useLocation, useNavigate, type Location, type NavigateFunction } from 'react-router-dom';

import { useSession } from '@/core/auth/session-context';
import { safeRedirectTarget } from '@/core/auth/navigation';
import { resolveLocale } from '@/core/i18n/locale';
import { useShellAlertNotificationController } from '@/features/alert/shell';
import { useShellMonitorImportTaskNotifications } from '@/features/monitor/shell';
import { useRuntimeStatusController } from '@/features/runtime-status';
import { materializeTopologyInvestigation } from '@/features/topology';
import { useShellInvestigation } from '@/shared/investigation';
import {
  buildAgentWorkspacePath,
  canMaterializeAgentInvestigation,
  materializeAgentInvestigation
} from '@/features/ai-workspace/model/agent-workspace-context';
import { globalAutoRefreshValues, globalTimeRanges, type GlobalTimeRange, type SharedTimeValue } from '@/shared/time';

import styles from './hertzbeat-shell.module.css';
import statusStyles from './hertzbeat-shell-status.module.css';
import { ShellBrand, ShellHeaderActions } from './shell-header-presentation';
import { ShellStatusSpine } from './shell-status-spine';
import { useShellHeaderActionController } from './use-shell-header-action-controller';

export function ShellHeader() {
  const { t, i18n } = useTranslation();
  const { session } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const actions = useShellHeaderActionController();
  useShellMonitorImportTaskNotifications();
  const alertNotifications = useShellAlertNotificationController({
    locale: i18n.resolvedLanguage,
    notificationTitle: t('shell.alerts.browserTitle'),
    notificationBody: t('shell.alerts.browserBody'),
    onOpenAlerts: actions.openAlerts,
    roles: session?.roles ?? []
  });
  const runtimeStatus = useRuntimeStatusController();
  const publishedInvestigation = useShellInvestigation();
  const accountName = session?.username ?? '';
  const investigationAvailable = hasShellInvestigation(location, actions.sharedTime.window, publishedInvestigation);

  return (
    <header className={styles.header}>
      <div className={styles.brandSlot}>
        <ShellBrand theme={actions.theme} />
      </div>
      <div className={styles.headerSpine}>
        <ShellStatusSpine locale={i18n.resolvedLanguage} runtime={runtimeStatus} t={t} />
        <ShellTimeControl time={actions.sharedTime} t={t} locale={i18n.resolvedLanguage} />
        <ShellHeaderActions
          accountName={accountName}
          activeLocale={resolveLocale(i18n.resolvedLanguage)}
          alertNotifications={alertNotifications}
          fullscreen={actions.fullscreen}
          loggingOut={actions.loggingOut}
          {...(investigationAvailable
            ? {
                investigation: {
                  label: t('shell.actions.investigate'),
                  onOpen: () =>
                    openShellInvestigation(location, actions.sharedTime.window, navigate, publishedInvestigation)
                }
              }
            : {})}
          t={t}
          theme={actions.theme}
          onOpenAlerts={actions.openAlerts}
          onThemeChange={actions.setDarkTheme}
          onToggleFullscreen={() => void actions.toggleFullscreen()}
          onChangeLanguage={locale => void actions.changeLanguage(locale)}
          onOpenSettings={actions.openSettings}
          onLock={() => {
            if (session) actions.lock(session, `${location.pathname}${location.search}${location.hash}`);
          }}
          onLogout={() => void actions.logout()}
        />
      </div>
    </header>
  );
}

function hasShellInvestigation(
  location: Location,
  window: SharedTimeValue['window'],
  publishedInvestigation: ReturnType<typeof useShellInvestigation>
) {
  return (
    canMaterializeAgentInvestigation(location) ||
    materializeTopologyInvestigation(location, window) !== undefined ||
    publishedInvestigation !== undefined
  );
}

function openShellInvestigation(
  location: Location,
  window: SharedTimeValue['window'],
  navigate: NavigateFunction,
  publishedInvestigation: ReturnType<typeof useShellInvestigation>
) {
  const target =
    materializeTopologyInvestigation(location, window) ??
    publishedInvestigation ??
    materializeAgentInvestigation(location);
  const returnTo = safeRedirectTarget(`${location.pathname}${location.search}${location.hash}`);
  if (target) void navigate(buildAgentWorkspacePath(target, returnTo ?? undefined));
}

function ShellTimeControl({ time, t, locale }: { time: SharedTimeValue; t: TFunction; locale: string | undefined }) {
  if (time.headerMode === 'hidden' || !time.window) return null;
  if (time.headerMode === 'exact_window') {
    return (
      <div className={statusStyles.timePolicy} data-testid="shell-time-policy">
        <ClockCircleOutlined aria-hidden="true" />
        <span>{formatExactWindow(time.window, locale)}</span>
      </div>
    );
  }
  const items = globalTimeMenuItems(time, t);
  return (
    <Dropdown menu={{ items, onClick: info => updateGlobalTime(time, info.key) }} trigger={['click']}>
      <Button className={statusStyles.timePolicy ?? ''} data-testid="shell-time-policy" type="text">
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
