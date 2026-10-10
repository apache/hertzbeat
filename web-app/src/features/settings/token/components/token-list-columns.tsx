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

import { Button, Space, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';

import { isTokenExpired, tokenScopeLabelKey, type TokenResourceRecord } from '../model/token-model';
import styles from './token.module.css';

export function tokenColumns(
  t: TFunction,
  confirmRevoke: (token: TokenResourceRecord) => void,
  revokingId: number | null
): ColumnsType<TokenResourceRecord> {
  return [...tokenIdentityColumns(t), ...tokenActivityColumns(t), tokenActionColumn(t, confirmRevoke, revokingId)];
}

function tokenIdentityColumns(t: TFunction): ColumnsType<TokenResourceRecord> {
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
        <Typography.Text className={styles.tokenMask ?? ''} code>
          {value || '—'}
        </Typography.Text>
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
    }
  ];
}

function tokenActivityColumns(t: TFunction): ColumnsType<TokenResourceRecord> {
  return [
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
      render: (value: TokenResourceRecord['expireTime'], token: TokenResourceRecord) =>
        value == null ? (
          <Tag color="success">{t('token.expiration.never')}</Tag>
        ) : (
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
    }
  ];
}

function tokenActionColumn(
  t: TFunction,
  confirmRevoke: (token: TokenResourceRecord) => void,
  revokingId: number | null
): ColumnsType<TokenResourceRecord>[number] {
  return {
    title: t('common.actions'),
    fixed: 'right',
    width: 110,
    render: (_value: unknown, token: TokenResourceRecord) => (
      <Button
        danger
        type="link"
        disabled={revokingId !== null}
        loading={revokingId === token.id}
        onClick={() => confirmRevoke(token)}
      >
        {t('token.revoke')}
      </Button>
    )
  };
}

function formatTokenTime(value: string | number | null) {
  if (value == null) return '—';
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  return new Date(timestamp).toLocaleString();
}
