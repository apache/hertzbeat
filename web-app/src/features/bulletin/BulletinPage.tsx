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

import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Empty, Input, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { apiMessageGet, type PageResult } from '@/core/http/api-message';

import styles from './BulletinPage.module.css';

type Bulletin = {
  id: number;
  name: string;
  app: string;
  monitorIds?: number[];
  creator?: string;
  gmtUpdate?: string;
};

export function BulletinPage() {
  const { t } = useTranslation();
  const [draftSearch, setDraftSearch] = useState('');
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['bulletins', search],
    queryFn: () => apiMessageGet<PageResult<Bulletin>>(
      `/api/bulletin?pageIndex=0&pageSize=20&search=${encodeURIComponent(search)}`
    )
  });

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <Typography.Title level={2}>{t('bulletin.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('bulletin.description')}</Typography.Text>
      </header>
      <Space.Compact className={styles.toolbar}>
        <Input
          value={draftSearch}
          placeholder={t('bulletin.search')}
          onChange={event => setDraftSearch(event.target.value)}
          onPressEnter={() => setSearch(draftSearch.trim())}
        />
        <Button type="primary" onClick={() => setSearch(draftSearch.trim())}>{t('common.query')}</Button>
      </Space.Compact>
      {query.isError && <Alert type="error" showIcon message={t('common.unavailable')} />}
      {!query.isError && query.data?.content.length === 0 && <Empty description={t('bulletin.empty')} />}
      {!query.isError && (query.isPending || Boolean(query.data?.content.length)) && (
        <Table<Bulletin>
          rowKey="id"
          loading={query.isPending}
          dataSource={query.data?.content ?? []}
          pagination={false}
          columns={[
            { title: t('bulletin.name'), dataIndex: 'name' },
            { title: t('bulletin.application'), dataIndex: 'app', render: value => <Tag>{value}</Tag> },
            {
              title: t('bulletin.monitors'),
              dataIndex: 'monitorIds',
              render: (value: number[] | undefined) => value?.length ?? 0
            },
            { title: t('bulletin.creator'), dataIndex: 'creator' },
            { title: t('bulletin.updated'), dataIndex: 'gmtUpdate' }
          ]}
        />
      )}
    </div>
  );
}
