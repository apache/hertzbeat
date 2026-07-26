/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { EnvironmentOutlined, LockOutlined, LogoutOutlined, ToolOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Dropdown, Modal, Space, Typography } from 'antd';
import type { TFunction } from 'i18next';
import { useState } from 'react';

import { appMetadata } from '@/core/app-metadata';

import styles from './hertzbeat-shell.module.css';

type ShellAccountMenuProps = {
  accountName: string;
  loggingOut: boolean;
  t: TFunction;
  onOpenSettings: () => void;
  onLock: () => void;
  onLogout: () => void;
};

export function ShellAccountMenu(props: ShellAccountMenuProps) {
  const [aboutOpen, setAboutOpen] = useState(false);
  return (
    <>
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            { key: 'settings', icon: <ToolOutlined />, label: props.t('shell.account.settings') },
            { key: 'lock', icon: <LockOutlined />, label: props.t('shell.account.lock'), disabled: props.loggingOut },
            { key: 'about', icon: <EnvironmentOutlined />, label: props.t('shell.account.about') },
            { type: 'divider' },
            {
              key: 'logout',
              icon: <LogoutOutlined />,
              label: props.t('shell.account.logout'),
              disabled: props.loggingOut
            }
          ],
          onClick: info => dispatchAccountAction(info.key, props, () => setAboutOpen(true))
        }}
      >
        <Button className={styles.accountButton ?? ''} type="text" aria-label={props.t('shell.actions.user')}>
          <Avatar size={24} icon={!props.accountName ? <UserOutlined /> : undefined}>
            {props.accountName.slice(0, 1).toUpperCase()}
          </Avatar>
          <span>{props.accountName}</span>
        </Button>
      </Dropdown>
      <AboutDialog open={aboutOpen} t={props.t} close={() => setAboutOpen(false)} />
    </>
  );
}

function AboutDialog({ open, t, close }: { open: boolean; t: TFunction; close: () => void }) {
  return (
    <Modal
      className={styles.aboutDialog ?? ''}
      open={open}
      title={t('shell.about.title')}
      onCancel={close}
      footer={<Button onClick={close}>{t('common.cancel')}</Button>}
      width={520}
    >
      <div className={styles.aboutIdentity}>
        <img src="/assets/logo.svg" alt="" width={28} height={27} />
        <div>
          <Typography.Title level={4}>{appMetadata.name}</Typography.Title>
          <Typography.Text type="secondary">
            {t('shell.about.version', { version: appMetadata.version })}
          </Typography.Text>
        </div>
      </div>
      <Typography.Paragraph>{t('shell.about.description')}</Typography.Paragraph>
      <Space wrap size={[16, 8]}>
        <AboutLink href={appMetadata.website} label={t('shell.about.website')} />
        <AboutLink href={appMetadata.documentation} label={t('shell.about.documentation')} />
        <AboutLink href={appMetadata.repository} label={t('shell.about.repository')} />
        <AboutLink href={appMetadata.issues} label={t('shell.about.issues')} />
      </Space>
    </Modal>
  );
}

function AboutLink({ href, label }: { href: string; label: string }) {
  return (
    <Typography.Link href={href} target="_blank" rel="noreferrer">
      {label}
    </Typography.Link>
  );
}

function dispatchAccountAction(key: string, props: ShellAccountMenuProps, openAbout: () => void) {
  if (key === 'settings') props.onOpenSettings();
  if (key === 'lock') props.onLock();
  if (key === 'about') openAbout();
  if (key === 'logout') props.onLogout();
}
