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

import { Button, Popconfirm, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

import type { NoticeTemplateActionCapabilities } from '../model/notice-template-action-capability';
import { noticeTemplateTime, noticeTemplateTypeLabelKey } from '../model/notice-template-view-model';
import {
  isNoticeTemplateReadOnly,
  noticeTemplatePageSizes,
  type NoticeTemplateListState,
  type NoticeTemplateResourceRecord
} from '../model/notice-template-model';

type NoticeTemplateResultsProps = {
  busy: boolean;
  capabilities: NoticeTemplateActionCapabilities;
  retryDisabled: boolean;
  state: NoticeTemplateListState;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  onRetry: () => void;
  onView: (template: NoticeTemplateResourceRecord) => void;
  onEdit: (template: NoticeTemplateResourceRecord) => void | Promise<void>;
  onRemove: (template: NoticeTemplateResourceRecord) => void | Promise<void>;
};

export function NoticeTemplateResults({
  busy,
  capabilities,
  retryDisabled,
  state,
  pageIndex,
  pageSize,
  onPageChange,
  onRetry,
  onView,
  onEdit,
  onRemove
}: NoticeTemplateResultsProps) {
  const { t } = useTranslation();

  if (state.kind === 'loading') {
    return <OperationalStatePanel kind="loading" title={t('noticeTemplates.loading')} />;
  }
  if (state.kind === 'unavailable') {
    return (
      <FailureState kind="unavailable" disabled={retryDisabled} message={t('common.unavailable')} onRetry={onRetry} />
    );
  }
  if (state.kind === 'error') {
    return (
      <FailureState
        kind="error"
        disabled={retryDisabled}
        message={t('common.routeError.description')}
        onRetry={onRetry}
      />
    );
  }
  if (state.kind === 'empty' || state.records.length === 0) {
    return <OperationalStatePanel kind="empty" title={t('noticeTemplates.empty')} />;
  }

  return (
    <Table<NoticeTemplateResourceRecord>
      rowKey="id"
      size="small"
      tableLayout="fixed"
      dataSource={state.records}
      columns={templateColumns(t, busy, capabilities, onView, onEdit, onRemove)}
      scroll={{ x: 790 }}
      pagination={{
        current: pageIndex + 1,
        disabled: busy,
        pageSize,
        pageSizeOptions: [...noticeTemplatePageSizes],
        showSizeChanger: true,
        total: state.total,
        onChange: onPageChange
      }}
    />
  );
}

function FailureState({
  kind,
  disabled,
  message,
  onRetry
}: {
  kind: 'unavailable' | 'error';
  disabled: boolean;
  message: string;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <OperationalStatePanel
      kind={kind}
      title={message}
      action={
        <Button size="small" disabled={disabled} onClick={onRetry}>
          {t('common.retry')}
        </Button>
      }
    />
  );
}

function templateColumns(
  t: TFunction,
  busy: boolean,
  capabilities: NoticeTemplateActionCapabilities,
  view: (template: NoticeTemplateResourceRecord) => void,
  edit: (template: NoticeTemplateResourceRecord) => void | Promise<void>,
  remove: (template: NoticeTemplateResourceRecord) => void | Promise<void>
): ColumnsType<NoticeTemplateResourceRecord> {
  return [
    {
      title: t('noticeTemplates.name'),
      dataIndex: 'name',
      width: 230,
      ellipsis: true,
      render: (name: string) => <span title={name}>{name}</span>
    },
    {
      title: t('noticeTemplates.type'),
      width: 150,
      ellipsis: true,
      render: (_value, template) => {
        const label = t(noticeTemplateTypeLabelKey(template.type));
        return (
          <Tag color="processing" title={label}>
            {label}
          </Tag>
        );
      }
    },
    {
      title: t('noticeTemplates.source'),
      width: 100,
      ellipsis: true,
      render: (_value, template) => {
        const label = t(template.preset ? 'noticeTemplates.preset' : 'noticeTemplates.custom');
        return <Tag title={label}>{label}</Tag>;
      }
    },
    {
      title: t('noticeTemplates.updated'),
      width: 170,
      ellipsis: true,
      render: (_value, template) => {
        const value = formatTemplateTime(template);
        return <span title={value}>{value}</span>;
      }
    },
    templateActionColumn(t, busy, capabilities, view, edit, remove)
  ];
}

function templateActionColumn(
  t: TFunction,
  busy: boolean,
  capabilities: NoticeTemplateActionCapabilities,
  view: (template: NoticeTemplateResourceRecord) => void,
  edit: (template: NoticeTemplateResourceRecord) => void | Promise<void>,
  remove: (template: NoticeTemplateResourceRecord) => void | Promise<void>
): ColumnsType<NoticeTemplateResourceRecord>[number] {
  return {
    title: t('common.actions'),
    fixed: 'right',
    width: 140,
    render: (_value, template) => {
      if (isNoticeTemplateReadOnly(template) || (!capabilities.canEdit && !capabilities.canDelete)) {
        return (
          <Button type="link" disabled={busy} onClick={() => view(template)}>
            {t('common.view')}
          </Button>
        );
      }
      return (
        <Space>
          {capabilities.canEdit && (
            <Button type="link" disabled={busy} onClick={() => void edit(template)}>
              {t('common.edit')}
            </Button>
          )}
          {capabilities.canDelete && (
            <Popconfirm
              disabled={busy}
              title={t('noticeTemplates.deleteConfirm')}
              okButtonProps={{ disabled: busy }}
              onConfirm={() => !busy && void remove(template)}
            >
              <Button type="link" danger disabled={busy}>
                {t('noticeTemplates.delete')}
              </Button>
            </Popconfirm>
          )}
        </Space>
      );
    }
  };
}

function formatTemplateTime(template: NoticeTemplateResourceRecord) {
  const value = noticeTemplateTime(template);
  if (value == null) return '—';
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(timestamp)
    : '—';
}
