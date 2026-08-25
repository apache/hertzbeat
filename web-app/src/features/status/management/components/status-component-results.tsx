/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Popconfirm, Space, Tag } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

import type { StatusComponent } from '../model/status-management-contract';
import {
  statusComponentMethod,
  statusComponentState,
  statusStateKey,
  type StatusCollectionState
} from '../model/status-management-model';
import styles from './status-management.module.css';

type ComponentResultsProps = {
  state: StatusCollectionState<StatusComponent>;
  canUpdate: boolean;
  canDelete: boolean;
  commandLocked: boolean;
  onEdit: (record: StatusComponent) => void;
  onDelete: (id: number) => void;
};

export function ComponentResults(props: ComponentResultsProps) {
  const { t } = useTranslation();
  if (props.state.kind === 'loading') {
    return <OperationalStatePanel kind="loading" title={t('statusManagement.loadingComponents')} />;
  }
  if (props.state.kind === 'unavailable') {
    return <OperationalStatePanel kind="unavailable" title={t('common.unavailable')} />;
  }
  if (props.state.kind === 'permission')
    return <OperationalStatePanel kind="permission" title={t('common.permission.roleRequiredDescription')} />;
  if (props.state.kind === 'error') return <OperationalStatePanel kind="error" title={t('common.routeError.title')} />;
  if (props.state.kind === 'empty')
    return <OperationalStatePanel kind="empty" presentation="quiet" title={t('status.noComponents')} />;

  const records = props.state.kind === 'ready' ? props.state.records : [];
  return (
    <ul className={styles.componentList} aria-label={t('statusManagement.componentCollection')}>
      {records.map(row => (
        <ComponentRow key={row.id ?? row.name} row={row} {...props} />
      ))}
    </ul>
  );
}

function ComponentRow({ row, ...props }: ComponentResultsProps & { row: StatusComponent }) {
  const { t } = useTranslation();
  const state = row.method === statusComponentMethod.manual ? row.configState : row.state;
  const presentation = componentStatePresentation(state);
  return (
    <li className={styles.componentRow}>
      <div className={styles.componentCopy}>
        <strong>{row.name}</strong>
        <span>{row.description || '—'}</span>
      </div>
      <div className={styles.componentMeta}>
        <span>
          <small>{t('statusManagement.method')}</small>
          {t(row.method === statusComponentMethod.manual ? 'statusManagement.manual' : 'statusManagement.automatic')}
        </span>
        <Tag color={presentation.color} data-component-state={presentation.name}>
          {t(statusStateKey(state))}
        </Tag>
      </div>
      <ComponentActions row={row} {...props} />
    </li>
  );
}

function componentStatePresentation(state: number | undefined) {
  if (state === statusComponentState.normal) return { color: 'success', name: 'normal' } as const;
  if (state === statusComponentState.abnormal) return { color: 'error', name: 'abnormal' } as const;
  return { color: 'default', name: 'unknown' } as const;
}

function ComponentActions({ row, ...props }: ComponentResultsProps & { row: StatusComponent }) {
  const { t } = useTranslation();
  if (!props.canUpdate && !props.canDelete) return null;
  return (
    <Space size={2} className={styles.componentActions ?? ''}>
      {props.canUpdate && (
        <Button type="link" disabled={props.commandLocked} onClick={() => props.onEdit(row)}>
          {t('common.edit')}
        </Button>
      )}
      {props.canDelete && (
        <Popconfirm
          title={t('statusManagement.deleteComponentConfirm')}
          okButtonProps={{ disabled: props.commandLocked }}
          onConfirm={() => row.id && props.onDelete(row.id)}
        >
          <Button type="link" danger disabled={props.commandLocked}>
            {t('statusManagement.delete')}
          </Button>
        </Popconfirm>
      )}
    </Space>
  );
}
