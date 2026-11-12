/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  CloseOutlined,
  DeleteOutlined,
  PlusOutlined,
  ScheduleOutlined,
  SearchOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { Button, Input, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import { AgentWorkspaceSessionList } from './agent-workspace-session-list';
import { AgentWorkspaceSessionDeleteDialog } from './agent-workspace-session-delete-dialog';
import styles from './agent-workspace-session-pane.module.css';

export function AgentWorkspaceSessionPane({
  controller,
  isAdmin,
  onOpenProviders,
  onOpenSchedules,
  mobileOpen = false,
  onClose
}: {
  controller: AgentWorkspaceViewModel;
  isAdmin: boolean;
  onOpenProviders: () => void;
  onOpenSchedules: () => void;
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  return (
    <nav className={styles.sessions} data-mobile-open={mobileOpen} aria-label={t('aiWorkspace.sessions.label')}>
      <SessionPaneHeader controller={controller} onClose={onClose} />
      <div className={styles.sessionSearch}>
        <Input
          allowClear
          aria-label={t('aiWorkspace.sessions.search')}
          placeholder={t('aiWorkspace.sessions.search')}
          prefix={<SearchOutlined />}
          size="small"
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </div>
      <AgentWorkspaceSessionList controller={controller} query={query} />
      <div className={styles.historyActions}>
        <Button
          type="text"
          icon={<DeleteOutlined />}
          loading={controller.sessionDeletion?.phase === 'loading'}
          disabled={
            !controller.sessions.items.length ||
            controller.sessions.status !== 'ready' ||
            controller.sessionDeletion?.phase === 'deleting' ||
            !controller.actions.requestClearSessions
          }
          aria-label={t('aiWorkspace.sessions.clearAll')}
          onClick={() => void controller.actions.requestClearSessions?.()}
        >
          {t('aiWorkspace.sessions.clearAll')}
        </Button>
      </div>
      <AgentWorkspaceSessionDeleteDialog controller={controller} />
      {isAdmin ? <AdminActions onOpenProviders={onOpenProviders} onOpenSchedules={onOpenSchedules} /> : null}
    </nav>
  );
}

function AdminActions({
  onOpenProviders,
  onOpenSchedules
}: {
  onOpenProviders: () => void;
  onOpenSchedules: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.adminActions}>
      <Button
        aria-label={t('aiSchedules.workspaceAction')}
        icon={<ScheduleOutlined />}
        type="text"
        onClick={onOpenSchedules}
      >
        {t('aiSchedules.workspaceAction')}
      </Button>
      <Button
        aria-label={t('aiWorkspace.providers.action')}
        icon={<SettingOutlined />}
        type="text"
        onClick={onOpenProviders}
      >
        {t('aiWorkspace.providers.action')}
      </Button>
    </div>
  );
}

function SessionPaneHeader({
  controller,
  onClose
}: {
  controller: AgentWorkspaceViewModel;
  onClose?: (() => void) | undefined;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.paneHeader}>
      <Button
        className={styles.mobileClose ?? ''}
        icon={<CloseOutlined />}
        type="text"
        size="small"
        aria-label={t('aiWorkspace.sessions.close')}
        onClick={() => onClose?.()}
      />
      <Typography.Text strong>{t('aiWorkspace.sessions.title')}</Typography.Text>
      <Button
        aria-label={t('aiWorkspace.sessions.new')}
        icon={<PlusOutlined />}
        size="small"
        type="text"
        disabled={controller.sessionDeletion?.phase === 'deleting'}
        onClick={controller.actions.newInvestigation}
      >
        {t('aiWorkspace.sessions.new')}
      </Button>
    </div>
  );
}
