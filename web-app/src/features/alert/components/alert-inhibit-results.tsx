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

import { Alert, Button, Empty, Popconfirm, Skeleton, Space, Switch, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { alertInhibitPageSizes, type AlertInhibit } from '../model/alert-inhibit-model';
import styles from '../shared/alert-policy-page.module.css';
import type { AlertInhibitDetailState, AlertInhibitListState } from '../model/alert-inhibit-state';

type ResultsProps = {
  state: AlertInhibitListState;
  busy: boolean;
  pageIndex: number;
  pageSize: number;
  selectedIds: number[];
  selectIds: (ids: number[]) => unknown;
  edit: (id: number) => unknown;
  toggle: (inhibit: AlertInhibit, enabled: boolean) => unknown;
  remove: (id: number) => unknown;
  changePage: (page: number, pageSize: number) => void;
  retry: () => unknown;
};

function labelMap(labels: Record<string, string> | null) {
  if (labels === null || Object.keys(labels).length === 0) return '—';
  return (
    <div className={styles.labels}>
      {Object.entries(labels).map(([key, value]) => (
        <Tag key={key}>
          {key}:{value}
        </Tag>
      ))}
    </div>
  );
}

function labelList(labels: string[] | null) {
  if (labels === null || labels.length === 0) return '—';
  return (
    <div className={styles.labels}>
      {labels.map(label => (
        <Tag key={label}>{label}</Tag>
      ))}
    </div>
  );
}

function AlertInhibitActions({
  t,
  busy,
  inhibit,
  edit,
  remove
}: {
  t: TFunction;
  busy: boolean;
  inhibit: AlertInhibit;
  edit: ResultsProps['edit'];
  remove: ResultsProps['remove'];
}) {
  return (
    <Space>
      <Button
        type="link"
        disabled={busy}
        onClick={() => {
          if (!busy) void edit(inhibit.id);
        }}
      >
        {t('common.edit')}
      </Button>
      <Popconfirm
        disabled={busy}
        title={t('alertInhibits.deleteConfirm')}
        okButtonProps={{ disabled: busy }}
        onConfirm={() => {
          if (!busy) void remove(inhibit.id);
        }}
      >
        <Button type="link" danger disabled={busy}>
          {t('alertInhibits.delete')}
        </Button>
      </Popconfirm>
    </Space>
  );
}

function buildColumns(
  t: TFunction,
  busy: boolean,
  edit: ResultsProps['edit'],
  toggle: ResultsProps['toggle'],
  remove: ResultsProps['remove']
): ColumnsType<AlertInhibit> {
  return [
    { title: t('alertInhibits.name'), dataIndex: 'name', width: 210 },
    { title: t('alertInhibits.sourceLabels'), dataIndex: 'sourceLabels', render: labelMap },
    { title: t('alertInhibits.targetLabels'), dataIndex: 'targetLabels', render: labelMap },
    { title: t('alertInhibits.equalLabels'), dataIndex: 'equalLabels', render: labelList },
    {
      title: t('alertInhibits.enabled'),
      dataIndex: 'enable',
      width: 90,
      render: (value: boolean | null, inhibit) => (
        <Switch
          checked={value === true}
          disabled={busy || value === null}
          onChange={enabled => {
            if (!busy) void toggle(inhibit, enabled);
          }}
        />
      )
    },
    {
      title: t('alertInhibits.updated'),
      width: 180,
      render: (_value, inhibit) => inhibit.gmtUpdate ?? inhibit.gmtCreate ?? '—'
    },
    {
      title: t('common.actions'),
      width: 150,
      render: (_value, inhibit) => (
        <AlertInhibitActions t={t} busy={busy} inhibit={inhibit} edit={edit} remove={remove} />
      )
    }
  ];
}

export function AlertInhibitResults(props: ResultsProps) {
  const { t } = useTranslation();
  if (props.state.kind === 'unavailable')
    return <RetryFailure busy={props.busy} message={t('common.unavailable')} retry={props.retry} />;
  if (props.state.kind === 'error')
    return <RetryFailure busy={props.busy} message={t('common.routeError.description')} retry={props.retry} />;
  if (props.state.kind === 'empty') return <Empty description={t('alertInhibits.empty')} />;
  const records = props.state.kind === 'ready' ? props.state.records : [];
  const total = props.state.kind === 'ready' ? props.state.total : 0;
  return (
    <Table<AlertInhibit>
      rowKey="id"
      size="small"
      loading={props.state.kind === 'loading'}
      dataSource={records}
      columns={buildColumns(t, props.busy, props.edit, props.toggle, props.remove)}
      rowSelection={{
        selectedRowKeys: props.selectedIds,
        getCheckboxProps: () => ({ disabled: props.busy }),
        onChange: keys => {
          if (!props.busy) props.selectIds(keys.filter((key): key is number => typeof key === 'number'));
        }
      }}
      scroll={{ x: 1200 }}
      pagination={{
        current: props.pageIndex + 1,
        pageSize: props.pageSize,
        pageSizeOptions: [...alertInhibitPageSizes],
        showSizeChanger: true,
        disabled: props.busy,
        total,
        onChange: (page, pageSize) => {
          if (!props.busy) props.changePage(page, pageSize);
        }
      }}
    />
  );
}

export function AlertInhibitDetailFailure({
  state,
  busy,
  retry
}: {
  state: AlertInhibitDetailState;
  busy: boolean;
  retry: () => unknown;
}) {
  const { t } = useTranslation();
  if (state.kind === 'idle') return null;
  if (state.kind === 'loading') return <Skeleton active paragraph={false} />;
  const messageByKind = {
    missing: t('common.notFound.description'),
    unavailable: t('common.unavailable'),
    error: t('alertInhibits.loadFailed')
  } satisfies Record<typeof state.kind, string>;
  return <RetryFailure busy={busy} message={messageByKind[state.kind]} retry={retry} />;
}

function RetryFailure({ busy, message, retry }: { busy: boolean; message: string; retry: () => unknown }) {
  const { t } = useTranslation();
  return (
    <Alert
      type="error"
      showIcon
      message={message}
      action={
        <Button
          size="small"
          disabled={busy}
          onClick={() => {
            if (!busy) void retry();
          }}
        >
          {t('common.retry')}
        </Button>
      }
    />
  );
}
