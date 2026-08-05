/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import {
  notificationWorkspaceSteps,
  type NotificationWorkspaceStatus,
  type NotificationWorkspaceStep
} from './notification-workspace-model';
import styles from './notification-workspace-navigation.module.css';

export function NotificationWorkspaceNavigation({
  activeStep,
  status
}: {
  activeStep: NotificationWorkspaceStep;
  status: NotificationWorkspaceStatus;
}) {
  const { t } = useTranslation();
  return (
    <nav className={styles.workspace ?? ''} aria-label={t('notificationWorkspace.label')} data-active-step={activeStep}>
      <div className={styles.introduction}>
        <Typography.Text strong>{t('notificationWorkspace.title')}</Typography.Text>
        <Typography.Text type="secondary">{t('notificationWorkspace.description')}</Typography.Text>
      </div>
      <ol className={styles.steps}>
        {notificationWorkspaceSteps.map((step, index) => {
          const current = step.id === activeStep;
          return (
            <li key={step.id} className={current ? (styles.current ?? '') : ''}>
              <Link to={step.path} aria-current={current ? 'page' : undefined}>
                <span className={styles.index}>{index + 1}</span>
                <span className={styles.copy}>
                  <span>{t(`notificationWorkspace.steps.${step.id}.label`)}</span>
                  <span className={styles.dependency}>{t(`notificationWorkspace.steps.${step.id}.dependency`)}</span>
                </span>
                {current ? <CurrentStatus status={status} /> : <PeerStatus />}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function CurrentStatus({ status }: { status: NotificationWorkspaceStatus }) {
  const { t } = useTranslation();
  return (
    <Tag className={styles.status ?? ''} data-notification-status={status}>
      {t(`notificationWorkspace.status.${status}`)}
    </Tag>
  );
}

function PeerStatus() {
  const { t } = useTranslation();
  return <span className={styles.srOnly}>{t('notificationWorkspace.status.notLoaded')}</span>;
}
