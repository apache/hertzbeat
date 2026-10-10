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

import { Alert, Form, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import { METADATA_DATABASE_KINDS, type MetadataDatabaseKind } from '../model/setup-contract';
import {
  createManagementDatabaseDraft,
  managementJdbcUrlPlaceholder,
  type SetupConfigurationDraft
} from '../model/setup-configuration';
import styles from './setup-configuration-form.module.css';

const evidenceClass = styles.evidence ?? '';

type Props = {
  database: SetupConfigurationDraft['managementDatabase'];
  editable: boolean;
  update: (value: Partial<SetupConfigurationDraft['managementDatabase']>) => void;
};

export function SetupManagementDatabaseFields({ database, editable, update }: Props) {
  const { t } = useTranslation();
  return (
    <>
      <Form.Item label={t('setup.configuration.management.kind')} htmlFor="setup-management-kind">
        <Select
          id="setup-management-kind"
          aria-label={t('setup.configuration.management.kind')}
          disabled={!editable}
          value={database.kind ?? undefined}
          placeholder={t('setup.configuration.management.kindPlaceholder')}
          options={METADATA_DATABASE_KINDS.map(value => ({ value, label: databaseKindLabel(value) }))}
          onChange={kind => {
            if (kind) update(createManagementDatabaseDraft(kind));
          }}
        />
      </Form.Item>
      {database.kind === 'h2' && (
        <Alert
          className={evidenceClass}
          type="warning"
          role="note"
          showIcon
          message={t('setup.configuration.management.h2Warning')}
        />
      )}
      <Form.Item label={t('setup.configuration.management.jdbcUrl')} htmlFor="setup-management-jdbc-url" required>
        <Input
          id="setup-management-jdbc-url"
          required
          disabled={!editable}
          value={database.jdbcUrl}
          placeholder={managementJdbcUrlPlaceholder(database.kind)}
          onChange={event => update({ jdbcUrl: event.target.value })}
        />
      </Form.Item>
    </>
  );
}

function databaseKindLabel(kind: MetadataDatabaseKind) {
  if (kind === 'h2') return 'H2';
  if (kind === 'mysql') return 'MySQL';
  return 'PostgreSQL';
}
