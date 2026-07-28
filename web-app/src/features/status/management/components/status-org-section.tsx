/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';

import type { StatusOrg, StatusOrgRecord } from '../model/status-management-contract';
import type { StatusRecordState } from '../model/status-management-model';
import styles from './status-management.module.css';
import { StatusOrgForm } from './status-org-form';
import { StatusSectionHeading } from './status-section-heading';

type StatusOrgSectionProps = {
  canCreate: boolean;
  canUpdate: boolean;
  state: StatusRecordState<StatusOrgRecord>;
  saving: boolean;
  commandLocked: boolean;
  writeRecovery: 'proof' | 'commit-uncertain' | undefined;
  onRetryWrite: () => Promise<StatusOrgRecord | undefined>;
  onSave: (org: StatusOrg) => Promise<StatusOrgRecord>;
};

export function StatusOrgSection(props: StatusOrgSectionProps) {
  const { t } = useTranslation();
  return (
    <section className={styles.section}>
      <StatusSectionHeading
        title={t('statusManagement.organization')}
        description={t('statusManagement.organizationDescription')}
      />
      {props.state.kind === 'loading' && <Skeleton active paragraph={{ rows: 3 }} />}
      {props.state.kind === 'unavailable' && <Alert type="error" showIcon message={t('common.unavailable')} />}
      {props.state.kind === 'permission' && (
        <Alert type="warning" showIcon message={t('common.permission.roleRequiredDescription')} />
      )}
      {props.state.kind === 'error' && <Alert type="error" showIcon message={t('common.routeError.title')} />}
      {props.state.kind === 'missing' && (
        <>
          <Alert type="info" showIcon message={t('statusManagement.notConfigured')} />
          {(props.canCreate || props.writeRecovery) && (
            <StatusOrgForm
              key={props.canCreate ? 'write' : 'read'}
              org={undefined}
              canWrite={props.canCreate}
              saving={props.saving}
              commandLocked={props.commandLocked}
              writeRecovery={props.writeRecovery}
              onRetry={props.onRetryWrite}
              onSubmit={props.onSave}
            />
          )}
        </>
      )}
      {props.state.kind === 'ready' && (
        <StatusOrgForm
          key={props.canUpdate ? 'write' : 'read'}
          org={props.state.record}
          canWrite={props.canUpdate}
          saving={props.saving}
          commandLocked={props.commandLocked}
          writeRecovery={props.writeRecovery}
          onRetry={props.onRetryWrite}
          onSubmit={props.onSave}
        />
      )}
    </section>
  );
}
