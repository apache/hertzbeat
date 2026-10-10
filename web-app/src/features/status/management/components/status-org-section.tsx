/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';

import { OperationalStatePanel } from '@/shared/operational-page';

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
  return (
    <section className={styles.section}>
      <StatusOrgSectionIntro {...props} />
      <StatusOrgSectionContent {...props} />
    </section>
  );
}

function StatusOrgSectionIntro(props: StatusOrgSectionProps) {
  const { t } = useTranslation();
  const showSetup = props.state.kind === 'missing' && (props.canCreate || Boolean(props.writeRecovery));
  if (showSetup) {
    return (
      <div className={styles.setupIntro}>
        <Typography.Title level={4}>{t('statusManagement.setupTitle')}</Typography.Title>
        <Typography.Text type="secondary">{t('statusManagement.setupDescription')}</Typography.Text>
      </div>
    );
  }
  if (props.state.kind === 'ready') return null;
  return (
    <StatusSectionHeading
      title={t('statusManagement.organization')}
      description={t('statusManagement.organizationDescription')}
    />
  );
}

function StatusOrgSectionContent(props: StatusOrgSectionProps) {
  const { t } = useTranslation();
  switch (props.state.kind) {
    case 'loading':
      return <OperationalStatePanel kind="loading" title={t('statusManagement.loadingOrganization')} />;
    case 'unavailable':
      return <OperationalStatePanel kind="unavailable" title={t('common.unavailable')} />;
    case 'permission':
      return <OperationalStatePanel kind="permission" title={t('common.permission.roleRequiredDescription')} />;
    case 'error':
      return <OperationalStatePanel kind="error" title={t('common.routeError.title')} />;
    case 'missing':
      return <MissingStatusOrgContent {...props} />;
    case 'ready':
      return (
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
      );
  }
}

function MissingStatusOrgContent(props: StatusOrgSectionProps) {
  const { t } = useTranslation();
  if (!props.canCreate && !props.writeRecovery) {
    return <OperationalStatePanel kind="empty" title={t('statusManagement.notConfigured')} />;
  }
  return (
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
  );
}
