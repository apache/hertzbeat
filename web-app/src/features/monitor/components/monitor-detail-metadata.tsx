/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Descriptions, Space, Tag, Typography, type DescriptionsProps } from 'antd';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { monitorParamTypes, type Monitor, type MonitorParam } from '../model/monitor-contract';
import { monitorStatusColor, monitorStatusKey, parseMonitorTimestamp } from '../model/monitor-model';

import styles from './monitor-detail-view.module.css';

/**
 * Keeps the complete operational identity visible on the read-only surface.
 * These fields were present in the Angular detail and already belong to the
 * canonical monitor response, so hiding them would force operators into edit.
 */
export function MonitorDetailMetadata({
  monitor,
  collector,
  params
}: {
  monitor: Monitor;
  collector: string | null | undefined;
  params: MonitorParam[] | undefined;
}) {
  const { t } = useTranslation();
  return <Descriptions size="small" column={2} items={monitorMetadataItems(t, monitor, collector, params)} />;
}

function monitorMetadataItems(
  t: TFunction,
  monitor: Monitor,
  collector: string | null | undefined,
  params: MonitorParam[] | undefined
): NonNullable<DescriptionsProps['items']> {
  return [
    {
      key: 'status',
      label: t('monitor.status.label'),
      children: <Tag color={monitorStatusColor(monitor.status)}>{t(monitorStatusKey(monitor.status))}</Tag>
    },
    { key: 'id', label: t('monitor.metadata.id'), children: monitor.id },
    { key: 'app', label: t('monitor.application'), children: monitor.app },
    { key: 'instance', label: t('monitor.editor.endpoint'), children: monitor.instance },
    { key: 'schedule', label: t('monitor.metadata.schedule'), children: monitorSchedule(t, monitor) },
    { key: 'collector', label: t('monitor.metadata.collector'), children: collector || '—' },
    { key: 'created', label: t('monitor.metadata.created'), children: monitorTime(monitor.gmtCreate) },
    { key: 'updated', label: t('monitor.metadata.updated'), children: monitorTime(monitor.gmtUpdate) },
    {
      key: 'description',
      label: t('monitor.editor.descriptionLabel'),
      children: monitor.description || '—',
      span: 2
    },
    {
      key: 'labels',
      label: t('monitor.metadata.labels'),
      children: <MetadataEntries entries={monitor.labels} />,
      span: 2
    },
    {
      key: 'annotations',
      label: t('monitor.metadata.annotations'),
      children: <MetadataEntries entries={monitor.annotations} />,
      span: 2
    },
    {
      key: 'params',
      label: t('monitor.metadata.parameters'),
      children: <MonitorParameters params={params} />,
      span: 2
    }
  ];
}

function monitorSchedule(t: TFunction, monitor: Monitor) {
  if (monitor.scheduleType === 'cron' && monitor.cronExpression?.trim()) {
    return <Typography.Text code>{monitor.cronExpression}</Typography.Text>;
  }
  return monitor.intervals == null ? '—' : t('monitor.metadata.interval', { seconds: monitor.intervals });
}

function monitorTime(value?: number | string | null) {
  const timestamp = parseMonitorTimestamp(value);
  return timestamp === undefined
    ? '—'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(timestamp);
}

function MetadataEntries({ entries }: { entries: Record<string, string> | null | undefined }) {
  if (!entries || Object.keys(entries).length === 0) return <>—</>;
  return (
    <Space className={styles.metadataTags ?? ''} size={[4, 4]} wrap>
      {Object.entries(entries).map(([key, value]) => (
        <Tag key={key}>
          <span>{key}</span>
          <span>{value}</span>
        </Tag>
      ))}
    </Space>
  );
}

function MonitorParameters({ params }: { params: MonitorParam[] | undefined }) {
  if (!params || params.length === 0) return <>—</>;
  return (
    <Space direction="vertical" size={2}>
      {params.map((param, index) => (
        <Typography.Text key={param.id ?? `${param.field}:${index}`}>
          <Typography.Text code>{param.field}</Typography.Text>
          {' = '}
          {monitorParameterValue(param)}
        </Typography.Text>
      ))}
    </Space>
  );
}

function monitorParameterValue(param: MonitorParam) {
  if (param.paramValue === null || param.paramValue === undefined || param.paramValue === '') return '—';
  return param.type === monitorParamTypes.encrypted ? '••••••••' : param.paramValue;
}
