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

import { batchSessionStatus } from '../model/agent-batch-presentation';
import { DeleteOutlined, MoreOutlined } from '@ant-design/icons';
import { Button, Dropdown, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { AgentSession } from '../model/agent-workspace-contract';
import { groupAgentSessions } from '../model/agent-session-management';
import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import { sessionStatusLabel } from './agent-workspace-format';
import styles from './agent-workspace-session-pane.module.css';

export function AgentWorkspaceSessionList({
  controller,
  query
}: {
  controller: AgentWorkspaceViewModel;
  query: string;
}) {
  const { i18n, t } = useTranslation();
  const normalized = query.trim().toLocaleLowerCase(i18n.language);
  const visible = controller.sessions.items.filter(session =>
    `${session.title ?? ''} ${session.status}`.toLocaleLowerCase(i18n.language).includes(normalized)
  );
  const groups = groupAgentSessions(visible);
  return (
    <div className={styles.sessionList}>
      <SessionState controller={controller} hasQuery={Boolean(normalized)} visibleCount={visible.length} />
      {groups.map(group => (
        <section
          key={group.key}
          className={styles.sessionGroup}
          aria-label={t(`aiWorkspace.sessions.groups.${group.key}`)}
        >
          <h3>{t(`aiWorkspace.sessions.groups.${group.key}`)}</h3>
          {group.items.map(session => (
            <SessionRow key={session.sessionUid} session={session} controller={controller} />
          ))}
        </section>
      ))}
    </div>
  );
}

function SessionRow({ session, controller }: { session: AgentSession; controller: AgentWorkspaceViewModel }) {
  const { t } = useTranslation();
  const title = session.title || t('aiWorkspace.sessions.untitled');
  const busy = controller.sessionDeletion?.phase === 'deleting';
  const selected = session.sessionUid === controller.selectedSessionUid;
  const status = selected
    ? batchSessionStatus(session.status, controller.run.runUid, controller.batch?.progress)
    : session.status;
  return (
    <div className={styles.sessionRow} data-selected={selected}>
      <button
        type="button"
        className={styles.sessionButton}
        aria-pressed={selected}
        title={title}
        disabled={busy}
        onClick={() => void controller.actions.selectSession(session.sessionUid)}
      >
        <span className={styles.sessionTitle}>{title}</span>
        {['RUNNING', 'CREATED', 'FAILED', 'PARTIAL', 'RECOVERY_REQUIRED', 'NO_RUN', 'CANCELLED'].includes(
          status.toUpperCase()
        ) ? (
          <span className={styles.sessionStatus} data-status={status.toUpperCase()}>
            {status.toUpperCase() === 'FAILED'
              ? t('aiWorkspace.sessions.status.unfinished')
              : sessionStatusLabel(status, t)}
          </span>
        ) : null}
      </button>
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            {
              key: 'delete',
              danger: true,
              icon: <DeleteOutlined />,
              label: t('aiWorkspace.sessions.delete'),
              disabled: busy || !controller.actions.requestDeleteSession,
              onClick: () => controller.actions.requestDeleteSession?.(session.sessionUid)
            }
          ]
        }}
      >
        <Button
          type="text"
          size="small"
          icon={<MoreOutlined />}
          className={styles.sessionMenu ?? ''}
          aria-label={t('aiWorkspace.sessions.menu', { title })}
          disabled={busy}
        />
      </Dropdown>
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
  if (controller.sessions.status === 'loading')
    return <Typography.Text type="secondary">{t('aiWorkspace.sessions.loading')}</Typography.Text>;
  if (controller.sessions.status === 'error')
    return <Typography.Text type="danger">{t('aiWorkspace.sessions.unavailable')}</Typography.Text>;
  if (!controller.sessions.items.length)
    return <Typography.Text type="secondary">{t('aiWorkspace.sessions.empty')}</Typography.Text>;
  if (hasQuery && !visibleCount)
    return <Typography.Text type="secondary">{t('aiWorkspace.sessions.noMatches')}</Typography.Text>;
  return null;
}
