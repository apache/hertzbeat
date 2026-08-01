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

import { Button, Skeleton, Table } from 'antd';
import type { Key } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page/operational-page';

import type { AlertActionCapabilities } from '../model/alert-action-capability';
import { alertInhibitPageSizes, type AlertInhibit } from '../model/alert-inhibit-model';
import type { AlertInhibitDetailState, AlertInhibitListState } from '../model/alert-inhibit-state';
import { buildAlertInhibitColumns } from './alert-inhibit-table-columns';

type ResultsProps = {
  capabilities: AlertActionCapabilities;
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

export function AlertInhibitResults(props: ResultsProps) {
  const { t } = useTranslation();
  if (props.state.kind === 'unavailable')
    return <RetryFailure kind="unavailable" busy={props.busy} message={t('common.unavailable')} retry={props.retry} />;
  if (props.state.kind === 'error')
    return (
      <RetryFailure kind="error" busy={props.busy} message={t('common.routeError.description')} retry={props.retry} />
    );
  if (props.state.kind === 'empty') return <OperationalStatePanel kind="empty" title={t('alertInhibits.empty')} />;
  const records = props.state.kind === 'ready' ? props.state.records : [];
  const total = props.state.kind === 'ready' ? props.state.total : 0;
  return (
    <Table<AlertInhibit>
      rowKey="id"
      size="small"
      loading={props.state.kind === 'loading'}
      dataSource={records}
      columns={buildAlertInhibitColumns(t, props.busy, props.capabilities, {
        edit: props.edit,
        toggle: props.toggle,
        remove: props.remove
      })}
      {...(props.capabilities.canDelete
        ? {
            rowSelection: {
              selectedRowKeys: props.selectedIds,
              getCheckboxProps: () => ({ disabled: props.busy }),
              onChange: (keys: Key[]) => {
                if (!props.busy) props.selectIds(keys.filter((key): key is number => typeof key === 'number'));
              }
            }
          }
        : {})}
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
  return (
    <RetryFailure
      kind={state.kind === 'unavailable' ? 'unavailable' : 'error'}
      busy={busy}
      message={messageByKind[state.kind]}
      retry={retry}
    />
  );
}

function RetryFailure({
  kind,
  busy,
  message,
  retry
}: {
  kind: 'unavailable' | 'error';
  busy: boolean;
  message: string;
  retry: () => unknown;
}) {
  const { t } = useTranslation();
  return (
    <OperationalStatePanel
      kind={kind}
      title={message}
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
