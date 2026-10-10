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

import { PlusOutlined, ScheduleOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Input, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import { sessionStatusLabel } from './agent-workspace-format';
import styles from './agent-workspace-session-pane.module.css';

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
  const [query, setQuery] = useState('');
  return (
    <nav className={styles.sessions} aria-label={t('aiWorkspace.sessions.label')}>
      <div className={styles.paneHeader}>
        <Typography.Text strong>{t('aiWorkspace.sessions.title')}</Typography.Text>
        <Button
          aria-label={t('aiWorkspace.sessions.new')}
          icon={<PlusOutlined />}
          size="small"
          type="text"
          onClick={controller.actions.newInvestigation}
        >
          {t('aiWorkspace.sessions.new')}
        </Button>
      </div>
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
      <SessionList controller={controller} query={query} />
      {isAdmin ? <AdminActions onOpenProviders={onOpenProviders} onOpenSchedules={onOpenSchedules} /> : null}
    </nav>
  );
}

function SessionList({ controller, query }: { controller: AgentWorkspaceViewModel; query: string }) {
  const { i18n, t } = useTranslation();
  const normalizedQuery = query.trim().toLocaleLowerCase(i18n.language);
  const visibleSessions = useMemo(
    () =>
      normalizedQuery
        ? controller.sessions.items.filter(session =>
            `${session.title ?? ''} ${session.status}`.toLocaleLowerCase(i18n.language).includes(normalizedQuery)
          )
        : controller.sessions.items,
    [controller.sessions.items, i18n.language, normalizedQuery]
  );
  return (
    <div className={styles.sessionList}>
      <SessionState controller={controller} hasQuery={Boolean(normalizedQuery)} visibleCount={visibleSessions.length} />
      {visibleSessions.map(session => (
        <button
          className={styles.sessionButton}
          data-selected={session.sessionUid === controller.selectedSessionUid}
          key={session.sessionUid}
          type="button"
          onClick={() => void controller.actions.selectSession(session.sessionUid)}
        >
          <span className={styles.sessionTitle}>{session.title || t('aiWorkspace.sessions.untitled')}</span>
          <span className={styles.sessionMeta}>
            <small>{sessionStatusLabel(session.status, t)}</small>
            {session.gmtUpdate ? (
              <time dateTime={session.gmtUpdate}>{formatSessionTime(session.gmtUpdate, i18n.language)}</time>
            ) : null}
          </span>
        </button>
      ))}
    </div>
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

function SessionState({
  controller,
  hasQuery,
  visibleCount
}: {
  controller: AgentWorkspaceViewModel;
  hasQuery: boolean;
  visibleCount: number;
}) {
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
  if (hasQuery && visibleCount === 0) {
    return <Typography.Text type="secondary">{t('aiWorkspace.sessions.noMatches')}</Typography.Text>;
  }
  return null;
}

function formatSessionTime(value: string, locale: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return value;
  const now = new Date();
  const sameDay =
    timestamp.getFullYear() === now.getFullYear() &&
    timestamp.getMonth() === now.getMonth() &&
    timestamp.getDate() === now.getDate();
  return new Intl.DateTimeFormat(
    locale,
    sameDay ? { hour: '2-digit', minute: '2-digit' } : { month: 'short', day: '2-digit' }
  ).format(timestamp);
}
