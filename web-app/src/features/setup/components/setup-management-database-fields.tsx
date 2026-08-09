/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Form, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import { METADATA_DATABASE_KINDS, type MetadataDatabaseKind } from '../model/setup-contract';
import type { SetupConfigurationDraft } from '../model/setup-configuration';
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
            if (kind) update({ kind });
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
