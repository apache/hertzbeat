/* Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Popconfirm, Space, Switch, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import type { AgentSchedule } from '../model/agent-schedule-contract';
import type { AgentScheduleViewModel } from '../model/agent-schedule-view-model';
import styles from './agent-schedule-view.module.css';

type Translate = (key: string) => string;

export function AgentScheduleTable({ controller }: { controller: AgentScheduleViewModel }) {
  const { t } = useTranslation();
  return (
    <Table
      rowKey="id"
      size="small"
      columns={scheduleColumns(controller, t)}
      dataSource={controller.list.items}
      pagination={{
        current: controller.list.pageIndex + 1,
        pageSize: controller.list.pageSize,
        total: controller.list.total,
        showSizeChanger: true,
        onChange: (page, size) => void controller.actions.setPage(page - 1, size)
      }}
    />
  );
}

function scheduleColumns(controller: AgentScheduleViewModel, t: Translate): ColumnsType<AgentSchedule> {
  const busy = controller.busy !== null;
  return [
    {
      title: t('aiSchedules.columns.schedule'),
      render: (_, schedule) => (
        <span className={styles.scheduleName}>
          <Typography.Text strong>{schedule.name}</Typography.Text>
          <small>{schedule.cronExpression}</small>
        </span>
      )
    },
    {
      title: t('aiSchedules.columns.instruction'),
      dataIndex: 'instruction',
      render: value => <span className={styles.scheduleInstruction}>{value}</span>
    },
    deliveryColumn(controller, t),
    {
      title: t('aiSchedules.columns.nextRun'),
      dataIndex: 'nextTriggerAt',
      width: 170,
      render: (value: number | null) => (
        <span className={styles.scheduleTime}>{formatTimestamp(value, t('aiSchedules.never'))}</span>
      )
    },
    {
      title: t('aiSchedules.columns.enabled'),
      width: 90,
      render: (_, schedule) => (
        <Switch
          checked={schedule.enabled}
          disabled={busy}
          aria-label={t('aiSchedules.columns.enabled')}
          onChange={enabled => void controller.actions.toggle(schedule.id, enabled)}
        />
      )
    },
    actionsColumn(controller, t)
  ];
}

function deliveryColumn(controller: AgentScheduleViewModel, t: Translate): ColumnsType<AgentSchedule>[number] {
  return {
    title: t('aiSchedules.columns.delivery'),
    width: 210,
    render: (_, schedule) => (
      <span className={styles.scheduleName}>
        <span>{receiverNames(controller, schedule)}</span>
        <small>{templateName(controller, schedule, t('aiSchedules.editor.defaultTemplate'))}</small>
      </span>
    )
  };
}

function actionsColumn(controller: AgentScheduleViewModel, t: Translate): ColumnsType<AgentSchedule>[number] {
  const busy = controller.busy !== null;
  return {
    title: t('aiSchedules.columns.actions'),
    width: 330,
    render: (_, schedule) => (
      <Space size="small" wrap>
        <Button size="small" disabled={busy} onClick={() => void controller.actions.run(schedule.id)}>
          {t('aiSchedules.actions.runNow')}
        </Button>
        <Button size="small" disabled={busy} onClick={() => void controller.actions.openTranscript(schedule)}>
          {t('aiSchedules.actions.transcript')}
        </Button>
        <Button size="small" disabled={busy} onClick={() => controller.actions.openEdit(schedule)}>
          {t('aiSchedules.actions.edit')}
        </Button>
        <Popconfirm
          title={t('aiSchedules.actions.deleteConfirm')}
          onConfirm={() => void controller.actions.delete(schedule.id)}
        >
          <Button size="small" danger disabled={busy}>
            {t('aiSchedules.actions.delete')}
          </Button>
        </Popconfirm>
      </Space>
    )
  };
}

function receiverNames(controller: AgentScheduleViewModel, schedule: AgentSchedule) {
  return schedule.receiverIds
    .map(id => controller.options.receivers.find(receiver => receiver.id === id)?.name ?? String(id))
    .join(', ');
}

function templateName(controller: AgentScheduleViewModel, schedule: AgentSchedule, fallback: string) {
  if (schedule.templateId === null) return fallback;
  return (
    controller.options.templates.find(template => template.id === schedule.templateId)?.name ??
    String(schedule.templateId)
  );
}

function formatTimestamp(value: number | null, fallback: string) {
  return value === null
    ? fallback
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(value);
}
