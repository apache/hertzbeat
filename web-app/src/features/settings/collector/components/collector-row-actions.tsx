/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Typography } from 'antd';
import type { TFunction } from 'i18next';

import type { CollectorMutationAction, CollectorRecord } from '../model/collector-model';
import styles from './collector-row-actions.module.css';

export type CollectorRowActionsProps = {
  busy: boolean;
  onAction: (action: CollectorMutationAction, collectors: string[]) => void;
  onIntake: (name: string) => void;
  onRuntime: (name: string) => void;
};

export function CollectorRowActions({
  record,
  t,
  ...props
}: CollectorRowActionsProps & { record: CollectorRecord; t: TFunction }) {
  return (
    <div className={styles.actions}>
      <Button
        size="small"
        disabled={props.busy}
        aria-label={t('collectors.intake.configureNamed', { name: record.name })}
        onClick={() => props.onIntake(record.name)}
      >
        {t('collectors.intake.configure')}
      </Button>
      <Button
        size="small"
        disabled={props.busy}
        aria-label={t('collectors.runtime.configureNamed', { name: record.name })}
        onClick={() => props.onRuntime(record.name)}
      >
        {t('collectors.runtime.configure')}
      </Button>
      {record.immutable ? (
        <Typography.Text type="secondary">{t('collectors.protected')}</Typography.Text>
      ) : (
        <MutableActions {...props} record={record} t={t} />
      )}
    </div>
  );
}

function MutableActions({ record, t, ...props }: CollectorRowActionsProps & { record: CollectorRecord; t: TFunction }) {
  return (
    <>
      <Button
        size="small"
        disabled={props.busy}
        aria-label={t(record.online ? 'collectors.takeOfflineNamed' : 'collectors.takeOnlineNamed', {
          name: record.name
        })}
        onClick={() => props.onAction(record.online ? 'offline' : 'online', [record.name])}
      >
        {t(record.online ? 'collectors.takeOffline' : 'collectors.takeOnline')}
      </Button>
      <Button
        size="small"
        danger
        disabled={props.busy}
        aria-label={t('collectors.deleteNamed', { name: record.name })}
        onClick={() => props.onAction('delete', [record.name])}
      >
        {t('collectors.delete')}
      </Button>
    </>
  );
}
