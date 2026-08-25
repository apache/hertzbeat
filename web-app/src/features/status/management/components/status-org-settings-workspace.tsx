/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Form } from 'antd';
import type { FormInstance } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { StatusOrg } from '../model/status-management-contract';
import styles from './status-org-settings.module.css';
import { StatusOrgSummary } from './status-org-presentation';
import { StatusWriteRecoveryAlert } from './status-write-recovery-alert';

interface ConfiguredWorkspaceProps {
  org: StatusOrg;
  editing: boolean;
  actions: ReactNode;
  fields: ReactNode;
  writeRecovery: 'proof' | 'commit-uncertain' | undefined;
}

interface FormWorkspaceProps extends Omit<ConfiguredWorkspaceProps, 'org'> {
  org: StatusOrg | undefined;
  form: FormInstance<StatusOrg>;
  onFinish: (value: StatusOrg) => void;
}

export function StatusOrgFormWorkspace(props: FormWorkspaceProps) {
  const configured = props.org ? <StatusOrgConfiguredWorkspace {...props} org={props.org} /> : undefined;
  if (configured && !props.editing) return configured;
  return (
    <Form form={props.form} layout="vertical" onFinish={props.onFinish}>
      {configured ?? (
        <StatusOrgSetupWorkspace actions={props.actions} fields={props.fields} writeRecovery={props.writeRecovery} />
      )}
    </Form>
  );
}

function StatusOrgConfiguredWorkspace(props: ConfiguredWorkspaceProps) {
  const content = props.editing ? (
    <>
      {props.writeRecovery && <StatusWriteRecoveryAlert />}
      <div className={styles.settingsBody}>{props.fields}</div>
    </>
  ) : (
    <div className={styles.settingsBody}>
      <StatusOrgSummary org={props.org} />
    </div>
  );
  return (
    <div className={styles.configurationWorkspace}>
      <StatusOrgSettingsPanel actions={props.actions}>{content}</StatusOrgSettingsPanel>
    </div>
  );
}

export function StatusOrgSetupWorkspace({
  actions,
  fields,
  writeRecovery
}: {
  actions: ReactNode;
  fields: ReactNode;
  writeRecovery: 'proof' | 'commit-uncertain' | undefined;
}) {
  return (
    <div className={styles.setupWorkspace}>
      <div className={styles.setupForm}>
        {writeRecovery && <StatusWriteRecoveryAlert />}
        {fields}
        {actions}
      </div>
    </div>
  );
}

function StatusOrgSettingsPanel({ actions, children }: { actions: ReactNode; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <section className={styles.settingsPanel} aria-label={t('statusManagement.organization')}>
      <div className={styles.settingsContent}>
        <header className={styles.settingsContentHeader}>
          <h3>{t('statusManagement.organization')}</h3>
          {actions}
        </header>
        {children}
      </div>
    </section>
  );
}
