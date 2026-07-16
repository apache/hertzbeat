/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */
import { Alert, Button, Input, Skeleton, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  StatusCollectionState,
  StatusIncidentCollectionState,
  StatusRecordState
} from '../model/status-management-model';
import type {
  StatusComponent,
  StatusIncident,
  StatusOrg,
  StatusOrgRecord
} from '../model/status-management-contract';
import styles from './status-management.module.css';
import { ComponentResults, IncidentResults } from './status-management-results';
import { StatusOrgForm } from './status-org-form';

export function StatusOrgSection({ state, saving, onSave }: {
  state: StatusRecordState<StatusOrgRecord>;
  saving: boolean;
  onSave: (org: StatusOrg) => Promise<StatusOrgRecord>;
}) {
  const { t } = useTranslation();
  return (
    <section className={styles.section}>
      <SectionHeading
        title={t('statusManagement.organization')}
        description={t('statusManagement.organizationDescription')}
      />
      {state.kind === 'loading' && <Skeleton active paragraph={{ rows: 3 }} />}
      {state.kind === 'unavailable' && <Alert type="error" showIcon message={t('common.unavailable')} />}
      {state.kind === 'error' && <Alert type="error" showIcon message={t('common.routeError.title')} />}
      {state.kind === 'missing' && (
        <>
          <Alert type="info" showIcon message={t('statusManagement.notConfigured')} />
          <StatusOrgForm org={undefined} saving={saving} onSubmit={onSave} />
        </>
      )}
      {state.kind === 'ready' && <StatusOrgForm org={state.record} saving={saving} onSubmit={onSave} />}
    </section>
  );
}

export function StatusComponentSection({ orgId, state, onNew, onEdit, onDelete }: {
  orgId: number | undefined;
  state: StatusCollectionState<StatusComponent>;
  onNew: () => void;
  onEdit: (record: StatusComponent) => void;
  onDelete: (id: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <section className={styles.section}>
      <SectionHeading
        title={t('status.components')}
        description={t('statusManagement.componentsDescription')}
        action={<Button type="primary" disabled={!orgId} onClick={onNew}>{t('statusManagement.newComponent')}</Button>}
      />
      <ComponentResults state={state} onEdit={onEdit} onDelete={onDelete} />
    </section>
  );
}

type IncidentSectionProps = {
  orgId: number | undefined;
  componentCount: number;
  draftSearch: string;
  state: StatusIncidentCollectionState<StatusIncident>;
  detailLoading: boolean;
  detailState: 'missing' | 'unavailable' | 'error' | undefined;
  records: StatusIncident[];
  pageIndex: number;
  pageSize: number;
  total: number;
  onDraftSearch: (value: string) => void;
  onQuery: () => void;
  onRefresh: () => void;
  onNew: () => void;
  onPageChange: (pageIndex: number, pageSize: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
};

export function StatusIncidentSection(props: IncidentSectionProps) {
  const { t } = useTranslation();
  return (
    <section className={styles.section}>
      <SectionHeading
        title={t('status.incidents')}
        description={t('statusManagement.incidentsDescription')}
        action={(
          <Button type="primary" disabled={!props.orgId || props.componentCount === 0} onClick={props.onNew}>
            {t('statusManagement.newIncident')}
          </Button>
        )}
      />
      <div className={styles.toolbar}>
        <Input
          allowClear
          value={props.draftSearch}
          placeholder={t('statusManagement.searchIncidents')}
          onChange={event => props.onDraftSearch(event.target.value)}
          onPressEnter={props.onQuery}
        />
        <Button type="primary" onClick={props.onQuery}>{t('common.query')}</Button>
        <Button onClick={props.onRefresh}>{t('common.refresh')}</Button>
      </div>
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

function SectionHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <header className={styles.sectionHeading}>
      <div>
        <Typography.Title level={4}>{title}</Typography.Title>
        <Typography.Text type="secondary">{description}</Typography.Text>
      </div>
      {action}
    </header>
  );
}

function detailStateKey(state: 'missing' | 'unavailable' | 'error') {
  return state === 'unavailable' ? 'common.unavailable' : 'statusManagement.loadIncidentFailed';
}
