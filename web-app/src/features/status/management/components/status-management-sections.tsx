/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */
import { Alert, Button, Input, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { isStatusOrgNotFound } from '../model/status-management-model';
import type { StatusComponent, StatusIncident, StatusOrg } from '../model/status-management-contract';
import styles from './status-management.module.css';
import { ComponentResults, IncidentResults } from './status-management-results';
import { StatusOrgForm } from './status-org-form';

export function StatusOrgSection({ org, pending, error, saving, onSave }: {
  org: StatusOrg | undefined;
  pending: boolean;
  error: Error | null;
  saving: boolean;
  onSave: (org: StatusOrg) => Promise<void>;
}) {
  const { t } = useTranslation();
  const missing = isMissingOrg(error);
  const canAuthor = !pending && (!error || missing);
  return (
    <section className={styles.section}>
      <SectionHeading
        title={t('statusManagement.organization')}
        description={t('statusManagement.organizationDescription')}
      />
      {error && !missing && <Alert type="error" showIcon message={t('common.unavailable')} />}
      {missing && <Alert type="info" showIcon message={t('statusManagement.notConfigured')} />}
      {canAuthor && <StatusOrgForm org={org} saving={saving} onSubmit={onSave} />}
    </section>
  );
}

export function StatusComponentSection({ orgId, records, loading, error, onNew, onEdit, onDelete }: {
  orgId: number | undefined;
  records: StatusComponent[];
  loading: boolean;
  error: boolean;
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
      <ComponentResults loading={loading} error={error} records={records} onEdit={onEdit} onDelete={onDelete} />
    </section>
  );
}

type IncidentSectionProps = {
  orgId: number | undefined;
  componentCount: number;
  draftSearch: string;
  loading: boolean;
  error: boolean;
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

function isMissingOrg(error: Error | null) {
  return isStatusOrgNotFound(error);
}
