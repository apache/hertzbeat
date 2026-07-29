/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Switch, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';

import type { AlertActionCapabilities } from '../model/alert-action-capability';
import type { AlertInhibit } from '../model/alert-inhibit-model';
import styles from '../shared/alert-policy-page.module.css';
import { AlertInhibitActions } from './alert-inhibit-actions';

type AlertInhibitTableActions = {
  edit: (id: number) => unknown;
  toggle: (inhibit: AlertInhibit, enabled: boolean) => unknown;
  remove: (id: number) => unknown;
};

export function buildAlertInhibitColumns(
  t: TFunction,
  busy: boolean,
  capabilities: AlertActionCapabilities,
  actions: AlertInhibitTableActions
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
          disabled={busy || !capabilities.canWrite || value === null}
          onChange={enabled => {
            if (!busy) void actions.toggle(inhibit, enabled);
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
        <AlertInhibitActions
          t={t}
          busy={busy}
          capabilities={capabilities}
          inhibit={inhibit}
          edit={actions.edit}
          remove={actions.remove}
        />
      )
    }
  ];
}

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
