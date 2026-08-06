/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  FullscreenExitOutlined,
  FullscreenOutlined,
  GlobalOutlined,
  MoonOutlined,
  SunOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { Switch, Tooltip } from 'antd';
import type { TFunction } from 'i18next';

import type { RuntimeTheme } from '@/core/runtime-preferences';
import type { ShellAlertNotificationState } from '@/features/alert/shell';

import styles from './hertzbeat-shell.module.css';
import { ShellAccountMenu } from './shell-account-menu';
import { ShellAlertNotifications } from './shell-alert-notifications';
import { ShellHeaderAction } from './shell-header-action';
import type { ShellFullscreenState } from './use-shell-fullscreen-action';

type ShellHeaderActionsProps = {
  accountName: string;
  alertNotifications: ShellAlertNotificationState;
  fullscreen: ShellFullscreenState;
  loggingOut: boolean;
  showRefresh: boolean;
  t: TFunction;
  theme: RuntimeTheme;
  onRefresh: () => void;
  onOpenAlerts: () => void;
  onThemeChange: (dark: boolean) => void;
  onToggleFullscreen: () => void;
  onChangeLanguage: () => void;
  onOpenSettings: () => void;
  onLock: () => void;
  onLogout: () => void;
};

export function ShellHeaderActions({
  accountName,
  alertNotifications,
  fullscreen,
  loggingOut,
  showRefresh,
  t,
  theme,
  onRefresh,
  onOpenAlerts,
  onThemeChange,
  onToggleFullscreen,
  onChangeLanguage,
  onOpenSettings,
  onLock,
  onLogout
}: ShellHeaderActionsProps) {
  return (
    <div className={styles.headerActions}>
      {showRefresh && (
        <ShellHeaderAction label={t('shell.actions.refresh')} icon={<ReloadOutlined />} onClick={onRefresh} />
      )}
      <ShellAlertNotifications state={alertNotifications} t={t} onOpenAlerts={onOpenAlerts} />
      <ShellThemeSwitch theme={theme} t={t} onChange={onThemeChange} />
      {fullscreen.available ? (
        <ShellHeaderAction
          disabled={fullscreen.busy}
          label={t(fullscreen.active ? 'shell.actions.fullscreenExit' : 'shell.actions.fullscreenEnter')}
          icon={fullscreen.active ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
          onClick={onToggleFullscreen}
        />
      ) : null}
      <ShellHeaderAction label={t('shell.actions.language')} icon={<GlobalOutlined />} onClick={onChangeLanguage} />
      <ShellAccountMenu
        accountName={accountName}
        loggingOut={loggingOut}
        t={t}
        onOpenSettings={onOpenSettings}
        onLock={onLock}
        onLogout={onLogout}
      />
    </div>
  );
}

function ShellThemeSwitch({
  theme,
  t,
  onChange
}: {
  theme: RuntimeTheme;
  t: TFunction;
  onChange: (dark: boolean) => void;
}) {
  const dark = theme !== 'default';
  const label = t(dark ? 'shell.actions.useLightTheme' : 'shell.actions.useDarkTheme');
  return (
    <Tooltip title={label}>
      <Switch
        aria-label={label}
        checked={dark}
        checkedChildren={<MoonOutlined aria-hidden="true" />}
        className={styles.themeSwitch ?? ''}
        size="small"
        unCheckedChildren={<SunOutlined aria-hidden="true" />}
        onChange={checked => onChange(checked)}
      />
    </Tooltip>
  );
}
