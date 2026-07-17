/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  BellOutlined, BgColorsOutlined, ClockCircleOutlined, GlobalOutlined, LogoutOutlined,
  ReloadOutlined, UserOutlined
} from '@ant-design/icons';
import { useGo } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { App, Avatar, Button, Dropdown, Tooltip, type MenuProps } from 'antd';
import type { TFunction } from 'i18next';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { anonymousSession, logoutSession, sessionQueryKey } from '@/core/auth/session-api';
import { useSession } from '@/core/auth/session-context';
import { loadLocale, resolveLocale, type SupportedLocale } from '@/core/i18n/i18n';
import { persistSystemPreferences, readRuntimeLocale } from '@/core/runtime-preferences';
import { useRuntimeTheme } from '@/core/runtime-theme-context';
import {
  globalAutoRefreshValues, globalTimeRanges, useSharedTime, type GlobalTimeRange, type SharedTimeValue
} from '@/shared/time';

import styles from './hertzbeat-shell.module.css';

const locales: SupportedLocale[] = ['en-US', 'zh-CN', 'zh-TW', 'ja-JP', 'pt-BR'];

export function ShellHeader({ collapsed }: { collapsed: boolean }) {
  const { t, i18n } = useTranslation();
  const { message } = App.useApp();
  const { session } = useSession();
  const { theme, setTheme } = useRuntimeTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const go = useGo();
  const sharedTime = useSharedTime();
  const [loggingOut, setLoggingOut] = useState(false);
  const accountName = session?.username ?? '';

  const refresh = async () => {
    sharedTime.requestRefresh();
    await queryClient.invalidateQueries({ type: 'active' });
  };

  const changeLanguage = async () => {
    const current = readRuntimeLocale() ?? resolveLocale(i18n.resolvedLanguage);
    const next = locales[(locales.indexOf(current) + 1) % locales.length] ?? 'en-US';
    persistSystemPreferences({ locale: next, theme });
    await loadLocale(next);
  };

  const toggleTheme = () => {
    setTheme(theme === 'default' ? 'dark' : 'default');
  };

  const logout = async () => {
    setLoggingOut(true);
    try {
      await logoutSession();
      queryClient.setQueryData(sessionQueryKey, anonymousSession);
      await navigate('/passport/login', { replace: true });
    } catch {
      void message.error(t('auth.logoutFailed'));
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.brandSlot}>
        <img className={styles.brandLogo} src="/assets/logo.svg" alt="HertzBeat" width={24} height={23} />
        {!collapsed && <strong className={styles.brandName} aria-hidden="true">HertzBeat</strong>}
      </div>
      <div className={styles.headerSpine}>
        <div className={styles.statusSpine} aria-label={t('shell.status.summary')}>
          <StatusSlot id="server" label={t('shell.status.server')} value={t('shell.status.unknown')} />
          <StatusSlot id="greptime" label={t('shell.status.greptime')} value={t('shell.status.unknown')} />
          <StatusSlot id="collector" label={t('shell.status.collector')} value={t('shell.status.unknown')} />
        </div>
        <ShellTimeControl time={sharedTime} t={t} locale={i18n.resolvedLanguage} />
        <div className={styles.headerActions}>
          {sharedTime.headerMode !== 'hidden' && (
            <HeaderAction label={t('shell.actions.refresh')} icon={<ReloadOutlined />} onClick={() => void refresh()} />
          )}
          <HeaderAction label={t('shell.actions.alerts')} icon={<BellOutlined />} onClick={() => go({ to: '/alerts', type: 'push' })} />
          <HeaderAction label={t('shell.actions.theme')} icon={<BgColorsOutlined />} onClick={toggleTheme} />
          <HeaderAction label={t('shell.actions.language')} icon={<GlobalOutlined />} onClick={() => void changeLanguage()} />
          <Dropdown
            trigger={['click']}
            menu={{
              items: [{ key: 'logout', icon: <LogoutOutlined />, label: t('auth.logout'), disabled: loggingOut }],
              onClick: () => void logout()
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
      </div>
    </header>
  );
}

function ShellTimeControl({ time, t, locale }: {
  time: SharedTimeValue;
  t: TFunction;
  locale: string | undefined;
}) {
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
      key: `range:${range}`, label: t('shell.time.rangeOption', { range }), disabled: time.range === range
    })),
    { type: 'divider' as const },
    ...globalAutoRefreshValues.map(interval => ({
      key: `refresh:${interval}`,
      label: interval === 0 ? t('shell.time.autoRefreshOff')
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

function StatusSlot({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div className={styles.statusSlot} data-testid={`shell-status-${id}`}>
      <span className={styles.statusDot} aria-hidden="true" />
      <span>{label}</span>
      <small>{value}</small>
    </div>
  );
}

function HeaderAction({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <Tooltip title={label}>
      <Button className={styles.headerAction ?? ''} type="text" aria-label={label} icon={icon} onClick={onClick} />
    </Tooltip>
  );
}
