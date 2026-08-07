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
  SunOutlined
} from '@ant-design/icons';
import { Button, Dropdown, Switch, Tooltip, type MenuProps } from 'antd';
import type { TFunction } from 'i18next';

import { supportedLocales, type SupportedLocale } from '@/core/i18n/locale';
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
  activeLocale: SupportedLocale;
  fullscreen: ShellFullscreenState;
  loggingOut: boolean;
  t: TFunction;
  theme: RuntimeTheme;
  onOpenAlerts: () => void;
  onThemeChange: (dark: boolean) => void;
  onToggleFullscreen: () => void;
  onChangeLanguage: (locale: SupportedLocale) => void;
  onOpenSettings: () => void;
  onLock: () => void;
  onLogout: () => void;
};

export function ShellHeaderActions({
  accountName,
  alertNotifications,
  activeLocale,
  fullscreen,
  loggingOut,
  t,
  theme,
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
      <ShellLanguageMenu activeLocale={activeLocale} t={t} onChange={onChangeLanguage} />
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

export function ShellBrand({ theme }: { theme: RuntimeTheme }) {
  const source = theme === 'default' ? '/assets/hertzbeat-brand.svg' : '/assets/hertzbeat-brand-white.svg';
  return <img className={styles.brandLogo} src={source} alt="HertzBeat" width={112} height={28} />;
}

function ShellLanguageMenu({
  activeLocale,
  t,
  onChange
}: {
  activeLocale: SupportedLocale;
  t: TFunction;
  onChange: (locale: SupportedLocale) => void;
}) {
  const items: NonNullable<MenuProps['items']> = supportedLocales.map(locale => ({
    key: locale,
    label: t(`systemConfig.locale.${locale.replace('-', '_')}`),
    disabled: locale === activeLocale
  }));
  return (
    <Dropdown menu={{ items, onClick: info => onChange(info.key as SupportedLocale) }} trigger={['click']}>
      <Button
        aria-label={t('shell.actions.language')}
        className={styles.headerAction ?? ''}
        icon={<GlobalOutlined />}
        type="text"
      />
    </Dropdown>
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
