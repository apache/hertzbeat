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

import { Button, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import type { EntitySummary } from '@/features/entity/queries';
import { ServiceDirectoryEmpty } from './service-performance-directory';
import { formatShortLocalTime } from '@/shared/time';
import { OperationalStatePanel } from '@/shared/operational-page';
import type { ServicesViewProps } from '../model/services-model';
import styles from './services-view.module.css';

export function ServiceDirectory({ state, actions }: ServicesViewProps) {
  const { t } = useTranslation();
  if (state.list.kind !== 'ready')
    return (
      <OperationalStatePanel
        presentation="quiet"
        kind={
          state.list.kind === 'idle'
            ? 'empty'
            : state.list.kind === 'invalid'
              ? 'error'
              : state.list.kind === 'missing'
                ? 'empty'
                : state.list.kind
        }
        title={t(`services.state.${state.list.kind}`)}
      />
    );
  if (!state.list.data.content.length)
    return <ServiceDirectoryEmpty state={state} actions={actions} total={state.list.data.totalElements} />;
  const columns = serviceColumns(t, state, actions);
  return (
    <Table
      size="small"
      rowKey="id"
      columns={columns}
      dataSource={state.list.data.content}
      scroll={{ x: 640 }}
      pagination={{
        current: (state.query.pageIndex ?? 0) + 1,
        pageSize: 10,
        total: state.list.data.totalElements,
        showSizeChanger: false,
        onChange: page => actions.page(page - 1)
      }}
    />
  );
}

function serviceColumns(
  t: ReturnType<typeof useTranslation>['t'],
  state: ServicesViewProps['state'],
  actions: ServicesViewProps['actions']
) {
  const columns: ColumnsType<EntitySummary> = [
    {
      title: t('services.service'),
      key: 'service',
      render: (_, row) => (
        <Button
          type="link"
          className={styles.serviceLink ?? ''}
          onClick={() => actions.select(row.id)}
          aria-pressed={state.query.entityId === String(row.id)}
        >
          {row.displayName ?? row.name}
        </Button>
      )
    },
    {
      title: t('services.environment'),
      dataIndex: 'environment',
      render: (value: string | undefined) => value || t('services.unknown')
    },
    {
      title: t('services.source'),
      dataIndex: 'source',
      render: (value: string | undefined) => value || t('services.unknown')
    },
    {
      title: t('services.lastEntityEvidence'),
      dataIndex: 'lastEvidenceAt',
      render: (value: number | undefined) =>
        value == null ? (
          t('services.unknown')
        ) : (
          <time dateTime={new Date(value).toISOString()}>{formatShortLocalTime(value, { date: true })}</time>
        )
    }
  ];
  return columns;
}
