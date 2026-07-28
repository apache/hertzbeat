/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Input } from 'antd';
import { useTranslation } from 'react-i18next';

import type { StatusIncident } from '../model/status-management-contract';
import type { StatusIncidentCollectionState } from '../model/status-management-model';
import { StatusDeleteRecoveryAlert } from './status-delete-recovery-alert';
import { IncidentResults } from './status-incident-results';
import styles from './status-management.module.css';
import { StatusSectionHeading } from './status-section-heading';

export type IncidentSectionProps = {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  orgId: number | undefined;
  componentCount: number;
  draftSearch: string;
  state: StatusIncidentCollectionState<StatusIncident>;
  detailLoading: boolean;
  detailState: 'missing' | 'permission' | 'unavailable' | 'error' | undefined;
  records: StatusIncident[];
  pageIndex: number;
  pageSize: number;
  total: number;
  commandLocked: boolean;
  deleteRecovery: boolean;
  deleteRecoveryPending: boolean;
  onDraftSearch: (value: string) => void;
  onQuery: () => void;
  onRefresh: () => Promise<boolean>;
  onNew: () => void;
  onPageChange: (pageIndex: number, pageSize: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
};

export function StatusIncidentSection(props: IncidentSectionProps) {
  const { t } = useTranslation();
  return (
    <section className={styles.section}>
      <StatusSectionHeading
        title={t('status.incidents')}
        description={t('statusManagement.incidentsDescription')}
        action={
          props.canCreate ? (
            <Button
              type="primary"
              disabled={!props.orgId || props.componentCount === 0 || props.commandLocked}
              onClick={props.onNew}
            >
              {t('statusManagement.newIncident')}
            </Button>
          ) : undefined
        }
      />
      <div className={styles.toolbar}>
        <Input
          allowClear
          disabled={props.commandLocked}
          value={props.draftSearch}
          placeholder={t('statusManagement.searchIncidents')}
          onChange={event => props.onDraftSearch(event.target.value)}
          onPressEnter={props.onQuery}
        />
        <Button type="primary" disabled={props.commandLocked} onClick={props.onQuery}>
          {t('common.query')}
        </Button>
        <Button disabled={props.commandLocked} onClick={() => void props.onRefresh()}>
          {t('common.refresh')}
        </Button>
      </div>
      {props.deleteRecovery && (
        <StatusDeleteRecoveryAlert pending={props.deleteRecoveryPending} onRetry={() => void props.onRefresh()} />
      )}
      {props.detailState && (
        <Alert
          type={props.detailState === 'missing' ? 'info' : 'error'}
          showIcon
          message={t(detailStateKey(props.detailState))}
        />
      )}
      <IncidentResults {...props} />
    </section>
  );
}

function detailStateKey(state: 'missing' | 'permission' | 'unavailable' | 'error') {
  if (state === 'permission') return 'common.permission.roleRequiredDescription';
  return state === 'unavailable' ? 'common.unavailable' : 'statusManagement.loadIncidentFailed';
}
