/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ScheduleOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import styles from './agent-workspace-view.module.css';

export function AgentWorkspaceSessionPane({
  controller,
  isAdmin,
  onOpenProviders,
  onOpenSchedules
}: {
  controller: AgentWorkspaceViewModel;
  isAdmin: boolean;
  onOpenProviders: () => void;
  onOpenSchedules: () => void;
}) {
  const { t } = useTranslation();
  return (
    <nav className={styles.sessions} aria-label={t('aiWorkspace.sessions.label')}>
      <div className={styles.paneHeader}>
        <Typography.Text strong>{t('aiWorkspace.sessions.title')}</Typography.Text>
        <Button size="small" type="primary" onClick={controller.actions.newInvestigation}>
          {t('aiWorkspace.sessions.new')}
        </Button>
      </div>
      <div className={styles.sessionList}>
        <SessionState controller={controller} />
        {controller.sessions.items.map(session => (
          <button
            className={styles.sessionButton}
            data-selected={session.sessionUid === controller.selectedSessionUid}
            key={session.sessionUid}
            type="button"
            onClick={() => controller.actions.selectSession(session.sessionUid)}
          >
            <span>{session.title || t('aiWorkspace.sessions.untitled')}</span>
            <small>{session.status}</small>
          </button>
        ))}
      </div>
      {isAdmin ? (
        <div className={styles.adminActions}>
          <Button aria-label={t('aiSchedules.workspaceAction')} icon={<ScheduleOutlined />} onClick={onOpenSchedules}>
            {t('aiSchedules.workspaceAction')}
          </Button>
          <Button icon={<SettingOutlined />} onClick={onOpenProviders}>
            {t('aiWorkspace.providers.action')}
          </Button>
        </div>
      ) : null}
    </nav>
  );
}

function SessionState({ controller }: { controller: AgentWorkspaceViewModel }) {
  const { t } = useTranslation();
  if (controller.sessions.status === 'loading') {
    return <Typography.Text type="secondary">{t('aiWorkspace.sessions.loading')}</Typography.Text>;
  }
  if (controller.sessions.status === 'error') {
    return <Typography.Text type="danger">{t('aiWorkspace.sessions.unavailable')}</Typography.Text>;
  }
  if (controller.sessions.items.length === 0) {
    return <Typography.Text type="secondary">{t('aiWorkspace.sessions.empty')}</Typography.Text>;
  }
  return null;
}
