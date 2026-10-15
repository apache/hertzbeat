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

import {
  ClockCircleOutlined,
  CopyOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
  TagOutlined
} from '@ant-design/icons';
import { App, Button, Table, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel, type OperationalStateKind } from '@/shared/operational-page';

import { tokenListPageSize, type TokenListState, type TokenResourceRecord } from '../model/token-model';
import type { TokenFailureKind } from '../model/token-failure';
import { tokenColumns } from './token-list-columns';
import styles from './token.module.css';

type TokenListProps = {
  list: TokenListState;
  refreshing: boolean;
  revokingId: number | null;
  generating: boolean;
  generationDisabled: boolean;
  onGenerate: () => void;
  onRetry: () => void | Promise<void>;
  onRevoke: (id: number) => void | Promise<void>;
};

export function TokenList(props: TokenListProps) {
  const { t } = useTranslation();
  const { modal } = App.useApp();

  if (props.list.kind === 'loading') {
    return <OperationalStatePanel kind="loading" title={t('token.loading')} />;
  }
  if (props.list.kind === 'empty') {
    return <TokenEmptyState {...props} />;
  }
  if (
    props.list.kind === 'unavailable' ||
    props.list.kind === 'invalid' ||
    props.list.kind === 'permission' ||
    props.list.kind === 'error'
  ) {
    return <TokenListFailureState kind={props.list.kind} onRetry={props.onRetry} />;
  }
  if (props.list.records.length === 0) {
    return <TokenEmptyState {...props} />;
  }

  const confirmRevoke = (token: TokenResourceRecord) => {
    modal.confirm({
      title: t('token.revokeConfirm'),
      content: t('token.revokeConfirmDescription', { name: token.name || token.tokenMask || '—' }),
      okText: t('token.revoke'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: () => props.onRevoke(token.id)
    });
  };
  const records = props.list.records;

  return (
    <div className={styles.table}>
      <Table<TokenResourceRecord>
        rowKey="id"
        size="small"
        loading={props.refreshing}
        dataSource={records}
        columns={tokenColumns(t, confirmRevoke, props.revokingId)}
        pagination={{
          defaultPageSize: tokenListPageSize,
          hideOnSinglePage: true,
          showSizeChanger: false,
          showTotal: total => t('token.total', { count: total })
        }}
        scroll={{ x: 1380 }}
      />
    </div>
  );
}

function TokenEmptyState(props: Pick<TokenListProps, 'generating' | 'generationDisabled' | 'onGenerate'>) {
  const { t } = useTranslation();
  const titleId = useId();
  return (
    <section className={styles.emptyState} data-state="empty" role="status" aria-labelledby={titleId}>
      <div className={styles.emptyIcon} aria-hidden="true">
        <KeyOutlined />
      </div>
      <Typography.Title level={3} id={titleId} className={styles.emptyTitle!}>
        {t('token.emptyTitle')}
      </Typography.Title>
      <Typography.Text type="secondary" className={styles.emptyDescription!}>
        {t('token.emptyDescription')}
      </Typography.Text>
      <ul className={styles.emptyGuidance}>
        <EmptyGuidance icon={<TagOutlined />} text={t('token.emptyName')} />
        <EmptyGuidance icon={<SafetyCertificateOutlined />} text={t('token.emptyScope')} />
        <EmptyGuidance icon={<ClockCircleOutlined />} text={t('token.emptyExpiry')} />
      </ul>
      <div className={styles.oneTimeNotice}>
        <CopyOutlined aria-hidden="true" />
        <span>{t('token.emptyOneTime')}</span>
      </div>
      <Button
        type="primary"
        size="large"
        loading={props.generating}
        disabled={props.generationDisabled}
        onClick={props.onGenerate}
      >
        {t('token.emptyAction')}
      </Button>
    </section>
  );
}

function EmptyGuidance({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <li>
      <span className={styles.guidanceIcon} aria-hidden="true">
        {icon}
      </span>
      <span>{text}</span>
    </li>
  );
}

function TokenListFailureState(props: Pick<TokenListProps, 'onRetry'> & { kind: TokenFailureKind }) {
  const { t } = useTranslation();
  return (
    <OperationalStatePanel
      kind={tokenFailureStateKind(props.kind)}
      title={t(tokenFailureMessageKey(props.kind))}
      action={
        <Button
          size="small"
          onClick={() => {
            void props.onRetry();
          }}
        >
          {t('common.retry')}
        </Button>
      }
    />
  );
}

function tokenFailureStateKind(kind: TokenFailureKind): OperationalStateKind {
  if (kind === 'permission') return 'permission';
  if (kind === 'unavailable') return 'unavailable';
  return 'error';
}

function tokenFailureMessageKey(kind: TokenFailureKind) {
  if (kind === 'unavailable') return 'token.unavailable';
  if (kind === 'invalid') return 'token.invalid';
  if (kind === 'permission') return 'common.permission.roleRequiredDescription';
  return 'common.routeError.description';
}
