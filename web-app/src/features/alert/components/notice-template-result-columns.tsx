/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Popconfirm, Space, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';

import type { NoticeTemplateActionCapabilities } from '../model/notice-template-action-capability';
import { noticeTemplateTime, noticeTemplateTypeLabelKey } from '../model/notice-template-view-model';
import { isNoticeTemplateReadOnly, type NoticeTemplateResourceRecord } from '../model/notice-template-model';

type NoticeTemplateColumnActions = {
  view: (template: NoticeTemplateResourceRecord) => void;
  edit: (template: NoticeTemplateResourceRecord) => void | Promise<void>;
  remove: (template: NoticeTemplateResourceRecord) => void | Promise<void>;
};

export function buildNoticeTemplateResultColumns(
  t: TFunction,
  busy: boolean,
  capabilities: NoticeTemplateActionCapabilities,
  actions: NoticeTemplateColumnActions
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
    noticeTemplateActionColumn(t, busy, capabilities, actions)
  ];
}

function noticeTemplateActionColumn(
  t: TFunction,
  busy: boolean,
  capabilities: NoticeTemplateActionCapabilities,
  actions: NoticeTemplateColumnActions
): ColumnsType<NoticeTemplateResourceRecord>[number] {
  return {
    title: t('common.actions'),
    fixed: 'right',
    width: 140,
    render: (_value, template) => {
      if (isNoticeTemplateReadOnly(template) || (!capabilities.canEdit && !capabilities.canDelete)) {
        return (
          <Button type="link" disabled={busy} onClick={() => actions.view(template)}>
            {t('common.view')}
          </Button>
        );
      }
      return (
        <Space>
          {capabilities.canEdit && (
            <Button type="link" disabled={busy} onClick={() => void actions.edit(template)}>
              {t('common.edit')}
            </Button>
          )}
          {capabilities.canDelete && (
            <Popconfirm
              disabled={busy}
              title={t('noticeTemplates.deleteConfirm')}
              okButtonProps={{ disabled: busy }}
              onConfirm={() => !busy && void actions.remove(template)}
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
