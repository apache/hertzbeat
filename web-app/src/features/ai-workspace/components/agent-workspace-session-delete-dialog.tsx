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

import { Alert, Modal, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';

export function AgentWorkspaceSessionDeleteDialog({ controller }: { controller: AgentWorkspaceViewModel }) {
  const { t } = useTranslation();
  const state = controller.sessionDeletion;
  if (!state) return null;
  const busy = state.phase === 'deleting';
  const open = state.phase === 'confirming' || busy;
  const count = state.sessionUids.length ?? 0;
  const active = Boolean(state.activeCount) || state.error === 'active';
  return (
    <Modal
      open={open}
      title={t('aiWorkspace.sessions.deleteTitle')}
      destroyOnHidden
      okText={t('aiWorkspace.sessions.deleteConfirm', { count })}
      cancelText={t('common.cancel')}
      confirmLoading={busy}
      okButtonProps={{ danger: true, disabled: active || !count }}
      cancelButtonProps={{ disabled: busy }}
      closable={!busy}
      keyboard={!busy}
      maskClosable={!busy}
      onCancel={() => controller.actions.cancelSessionDeletion?.()}
      onOk={() => void controller.actions.confirmSessionDeletion?.()}
    >
      {state.title ? (
        <Typography.Paragraph strong ellipsis={{ rows: 2 }}>
          {state.title}
        </Typography.Paragraph>
      ) : null}
      {count ? (
        <Typography.Paragraph>{t('aiWorkspace.sessions.deleteDescription', { count })}</Typography.Paragraph>
      ) : null}
      {active ? <Alert type="warning" showIcon message={t('aiWorkspace.sessions.activeCannotDelete')} /> : null}
      {state.error === 'unavailable' ? (
        <Alert type="error" showIcon message={t('aiWorkspace.sessions.deleteUnavailable')} />
      ) : null}
    </Modal>
  );
}
