/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  BgColorsOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  GlobalOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { TFunction } from 'i18next';

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
  onRefresh: () => void;
  onOpenAlerts: () => void;
  onToggleTheme: () => void;
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
  onRefresh,
  onOpenAlerts,
  onToggleTheme,
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
      <ShellHeaderAction label={t('shell.actions.theme')} icon={<BgColorsOutlined />} onClick={onToggleTheme} />
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
