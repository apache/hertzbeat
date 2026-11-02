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

import { Button, Checkbox, Dropdown, Modal, Alert, Typography, Space, Tooltip } from 'antd';
import { DownOutlined, SafetyOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { AgentPermissionControl } from '../model/agent-permission-mode';

export function AgentPermissionMode({ control }: { control: AgentPermissionControl }) {
  const { t } = useTranslation();
  const selected = control.phase === 'ready' ? control.mode : undefined;
  const label =
    control.phase === 'error'
      ? 'unavailable'
      : control.phase === 'loading'
        ? 'loading'
        : selected === 'FULL'
          ? 'full'
          : 'manual';
  return (
    <>
      <Tooltip
        title={t(
          control.phase === 'unselected' ? 'aiWorkspace.permission.selectSession' : 'aiWorkspace.permission.scope'
        )}
      >
        <Dropdown
          trigger={['click']}
          menu={{
            selectedKeys: selected ? [selected] : [],
            items: [
              {
                key: 'MANUAL',
                label: t('aiWorkspace.permission.manual'),
                onClick: () => void control.actions.revoke(),
                disabled: control.busy
              },
              {
                key: 'FULL',
                label: t('aiWorkspace.permission.full'),
                onClick: () => void control.actions.requestFull(),
                disabled: control.phase !== 'ready' || !control.fullAllowed || control.busy || selected === 'FULL'
              }
            ]
          }}
          disabled={control.phase === 'unselected'}
        >
          <Button
            size="small"
            type="text"
            icon={<SafetyOutlined />}
            aria-label={t('aiWorkspace.permission.label')}
            loading={control.busy}
          >
            {t(`aiWorkspace.permission.${label}`)} <DownOutlined />
          </Button>
        </Dropdown>
      </Tooltip>
      <PermissionConfirmation control={control} />
    </>
  );
}

function PermissionConfirmation({ control }: { control: AgentPermissionControl }) {
  const { t } = useTranslation();
  return (
    <Modal
      open={control.dialogOpen}
      title={t('aiWorkspace.permission.riskTitle')}
      okText={t('aiWorkspace.permission.enable')}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: !control.confirmAllowed, loading: control.busy }}
      closable
      maskClosable
      cancelButtonProps={{ disabled: false }}
      onCancel={control.actions.dismiss}
      onOk={() => void control.actions.confirm()}
    >
      <Space direction="vertical">
        <Alert type="warning" showIcon message={t('aiWorkspace.permission.risk')} />
        <Typography.Paragraph>{t('aiWorkspace.permission.scope')}</Typography.Paragraph>
        <Typography.Paragraph>{t('aiWorkspace.permission.boundaries')}</Typography.Paragraph>
        <Checkbox
          checked={control.acknowledged}
          onChange={event => control.actions.acknowledge(event.target.checked)}
          disabled={control.busy}
        >
          {t('aiWorkspace.permission.acknowledge')}
        </Checkbox>
        <Typography.Text aria-live="polite">
          {t(
            control.challengeExpired
              ? 'aiWorkspace.permission.expired'
              : control.remainingSeconds > 0
                ? 'aiWorkspace.permission.wait'
                : 'aiWorkspace.permission.ready',
            { seconds: control.remainingSeconds }
          )}
        </Typography.Text>
        {control.error ? <Alert type="error" message={t('aiWorkspace.permission.error')} /> : null}
      </Space>
    </Modal>
  );
}
