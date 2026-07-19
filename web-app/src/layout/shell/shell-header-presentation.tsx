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

import styles from './hertzbeat-shell.module.css';

export function ShellStatusSpine({ t }: { t: TFunction }) {
  return (
    <div className={styles.statusSpine} aria-label={t('shell.status.summary')}>
      <StatusSlot id="server" label={t('shell.status.server')} value={t('shell.status.unknown')} />
      <StatusSlot id="greptime" label={t('shell.status.greptime')} value={t('shell.status.unknown')} />
      <StatusSlot id="collector" label={t('shell.status.collector')} value={t('shell.status.unknown')} />
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
