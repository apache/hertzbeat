/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Alert, App, Button, Empty, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { SettingsNav } from '@/shared/settings/settings-nav';

import { GeneratedTokenModal, TokenGeneratorModal } from '../components/token-modals';
import styles from '../components/token.module.css';
import { useTokenResourceController } from '../controller/token-resource-controller';
import {
  isTokenExpired,
  tokenScopeLabelKey,
  type TokenListState,
  type TokenResourceRecord
} from '../model/token-model';

function formatTokenTime(value: string | number | null) {
  if (value == null) return '—';
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  return new Date(timestamp).toLocaleString();
}

function tokenColumns(
  t: TFunction,
  confirmRevoke: (token: TokenResourceRecord) => void,
  revokingId: number | null
): ColumnsType<TokenResourceRecord> {
  return [
    {
      title: t('token.name'),
      dataIndex: 'name',
      width: 180,
      render: (value: TokenResourceRecord['name']) => value || '—'
    },
    {
      title: t('token.mask'),
      dataIndex: 'tokenMask',
      width: 180,
      render: (value: TokenResourceRecord['tokenMask']) => (
        <Typography.Text className={styles.tokenMask ?? ''} code>{value || '—'}</Typography.Text>
      )
    },
    {
      title: t('token.scope.label'),
      dataIndex: 'tokenScope',
      width: 150,
      render: (value: TokenResourceRecord['tokenScope']) => {
        const labelKey = tokenScopeLabelKey(value);
        return labelKey ? <Tag>{t(labelKey)}</Tag> : '—';
      }
    },
    {
      title: t('token.creator'),
      dataIndex: 'creator',
      width: 140,
      render: (value: TokenResourceRecord['creator']) => value || '—'
    },
    {
      title: t('token.created'),
      dataIndex: 'gmtCreate',
      width: 190,
      render: (value: TokenResourceRecord['gmtCreate']) => formatTokenTime(value)
    },
    {
      title: t('token.expires'),
      dataIndex: 'expireTime',
      width: 210,
      render: (value: TokenResourceRecord['expireTime'], token: TokenResourceRecord) => value == null
        ? <Tag color="success">{t('token.expiration.never')}</Tag>
        : (
            <Space size={6}>
              <span>{formatTokenTime(value)}</span>
              {isTokenExpired(token) && <Tag color="error">{t('token.expired')}</Tag>}
            </Space>
          )
    },
    {
      title: t('token.lastUsed'),
      dataIndex: 'lastUsedTime',
      width: 190,
      render: (value: TokenResourceRecord['lastUsedTime']) => formatTokenTime(value)
    },
    {
      title: t('common.actions'),
      fixed: 'right',
      width: 110,
      render: (_value: unknown, token: TokenResourceRecord) => (
        <Button
          danger
          type="link"
          loading={revokingId === token.id}
          onClick={() => confirmRevoke(token)}
        >
          {t('token.revoke')}
        </Button>
      )
    }
  ];
}

function TokenTable(props: {
  list: TokenListState;
  refreshing: boolean;
  revokingId: number | null;
  onRetry: () => void;
  onRevoke: (token: TokenResourceRecord) => void;
}) {
  const { t } = useTranslation();
  if (props.list.kind === 'unavailable' || props.list.kind === 'error') {
    return (
      <Alert
        type="error"
        showIcon
        message={props.list.kind === 'unavailable' ? t('token.unavailable') : t('common.routeError.description')}
        action={<Button size="small" onClick={props.onRetry}>{t('common.retry')}</Button>}
      />
    );
  }
  const records = props.list.kind === 'ready' ? props.list.records : [];
  return (
    <div className={styles.table}>
      <Table<TokenResourceRecord>
        rowKey="id"
        size="small"
        loading={props.list.kind === 'loading' || props.refreshing}
        dataSource={records}
        columns={tokenColumns(t, props.onRevoke, props.revokingId)}
        locale={{ emptyText: <Empty description={t('token.empty')} /> }}
        pagination={false}
        scroll={{ x: 1380 }}
      />
    </div>
  );
}

export function TokenPage() {
  const { t } = useTranslation();
  const { modal } = App.useApp();
  const controller = useTokenResourceController();
  const confirmRevoke = (token: TokenResourceRecord) => {
    modal.confirm({
      title: t('token.revokeConfirm'),
      content: t('token.revokeConfirmDescription', { name: token.name || token.tokenMask || '—' }),
      okText: t('token.revoke'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: () => controller.revoke(token.id)
    });
  };

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t('token.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('token.description')}</Typography.Text>
        </div>
        <Button type="primary" loading={controller.state.generating} onClick={controller.openGenerator}>
          {t('token.generate')}
        </Button>
      </header>
      <SettingsNav />
      <TokenTable
        list={controller.state.list}
        refreshing={controller.state.refreshing}
        revokingId={controller.state.revokingId}
        onRetry={() => { void controller.retry(); }}
        onRevoke={confirmRevoke}
      />
      {controller.state.draft && (
        <TokenGeneratorModal
          draft={controller.state.draft}
          saving={controller.state.generating}
          onChange={controller.updateDraft}
          onCancel={controller.closeGenerator}
          onSubmit={() => { void controller.generate(); }}
        />
      )}
      {controller.state.generatedToken && (
        <GeneratedTokenModal
          token={controller.state.generatedToken}
          onCopy={() => { void controller.copyGeneratedToken(); }}
          onClose={controller.closeGeneratedToken}
        />
      )}
    </div>
  );
}
