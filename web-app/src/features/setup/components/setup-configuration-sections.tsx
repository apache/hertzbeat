/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Form, Input, Select, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { METADATA_DATABASE_KINDS, type MetadataDatabaseKind } from '../model/setup-contract';
import {
  managementSectionComplete,
  telemetrySectionComplete,
  type SetupConfigurationDraft,
  type SetupValidationSection
} from '../model/setup-configuration';
import type { SetupSectionValidationMap } from '../model/setup-configuration-state';
import styles from './setup-configuration-form.module.css';
import { SetupValidationEvidence } from './setup-validation-evidence';

const evidenceClass = styles.evidence ?? '';

type Props = {
  draft: SetupConfigurationDraft;
  editable: boolean;
  validation: SetupSectionValidationMap;
  updateManagement: (value: Partial<SetupConfigurationDraft['managementDatabase']>) => void;
  updateTelemetry: (value: Partial<SetupConfigurationDraft['telemetryStore']>) => void;
  validateSection: (section: SetupValidationSection) => Promise<void>;
};

export function ManagementConfigurationSection(props: Props) {
  const { t } = useTranslation();
  const database = props.draft.managementDatabase;
  const editable = props.editable && props.validation.metadata_database.state !== 'checking';
  return (
    <section className={styles.section} aria-labelledby="setup-management-title">
      <SectionHeading
        id="setup-management-title"
        title={t('setup.configuration.management.title')}
        description={t('setup.configuration.management.description')}
      />
      <Form.Item label={t('setup.configuration.management.kind')} htmlFor="setup-management-kind">
        <Select
          id="setup-management-kind"
          aria-label={t('setup.configuration.management.kind')}
          disabled={!editable}
          value={database.kind ?? undefined}
          placeholder={t('setup.configuration.management.kindPlaceholder')}
          options={METADATA_DATABASE_KINDS.map(value => ({ value, label: databaseKindLabel(value) }))}
          onChange={kind => {
            if (kind) props.updateManagement({ kind });
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
          onChange={event => props.updateManagement({ jdbcUrl: event.target.value })}
        />
      </Form.Item>
      <CredentialFields
        idPrefix="setup-management"
        required
        disabled={!editable}
        username={database.username}
        password={database.password}
        update={props.updateManagement}
      />
      <SetupValidationEvidence section="metadata_database" validation={props.validation.metadata_database} />
      <Button
        disabled={!editable || !managementSectionComplete(database)}
        loading={props.validation.metadata_database.state === 'checking'}
        onClick={() => void props.validateSection('metadata_database')}
      >
        {t('setup.configuration.validate')}
      </Button>
    </section>
  );
}

export function TelemetryConfigurationSection(props: Props) {
  const { t } = useTranslation();
  const store = props.draft.telemetryStore;
  const editable = props.editable && props.validation.telemetry_store.state !== 'checking';
  return (
    <section className={styles.section} aria-labelledby="setup-telemetry-title">
      <SectionHeading
        id="setup-telemetry-title"
        title={t('setup.configuration.telemetry.title')}
        description={t('setup.configuration.telemetry.description')}
      />
      <Form.Item label={t('setup.configuration.telemetry.grpcEndpoints')} htmlFor="setup-telemetry-grpc" required>
        <Input
          id="setup-telemetry-grpc"
          required
          disabled={!editable}
          value={store.grpcEndpoints}
          onChange={event => props.updateTelemetry({ grpcEndpoints: event.target.value })}
        />
      </Form.Item>
      <Form.Item label={t('setup.configuration.telemetry.httpEndpoint')} htmlFor="setup-telemetry-http" required>
        <Input
          id="setup-telemetry-http"
          required
          disabled={!editable}
          value={store.httpEndpoint}
          onChange={event => props.updateTelemetry({ httpEndpoint: event.target.value })}
        />
      </Form.Item>
      <Form.Item label={t('setup.configuration.telemetry.database')} htmlFor="setup-telemetry-database" required>
        <Input
          id="setup-telemetry-database"
          required
          disabled={!editable}
          value={store.database}
          onChange={event => props.updateTelemetry({ database: event.target.value })}
        />
      </Form.Item>
      <Typography.Paragraph type="secondary">{t('setup.configuration.telemetry.credentialsHint')}</Typography.Paragraph>
      <CredentialFields
        idPrefix="setup-telemetry"
        required={false}
        disabled={!editable}
        username={store.username}
        password={store.password}
        update={props.updateTelemetry}
      />
      <SetupValidationEvidence section="telemetry_store" validation={props.validation.telemetry_store} />
      <Button
        disabled={!editable || !telemetrySectionComplete(store)}
        loading={props.validation.telemetry_store.state === 'checking'}
        onClick={() => void props.validateSection('telemetry_store')}
      >
        {t('setup.configuration.validate')}
      </Button>
    </section>
  );
}

function CredentialFields({ idPrefix, disabled, required, username, password, update }: CredentialProps) {
  const { t } = useTranslation();
  return (
    <>
      <Form.Item label={t('setup.configuration.username')} htmlFor={`${idPrefix}-username`} required={required}>
        <Input
          id={`${idPrefix}-username`}
          disabled={disabled}
          required={required}
          autoComplete="off"
          value={username}
          onChange={event => update({ username: event.target.value })}
        />
      </Form.Item>
      <Form.Item label={t('setup.configuration.password')} htmlFor={`${idPrefix}-password`} required={required}>
        <Input.Password
          id={`${idPrefix}-password`}
          disabled={disabled}
          required={required}
          autoComplete="new-password"
          value={password}
          onChange={event => update({ password: event.target.value })}
        />
      </Form.Item>
    </>
  );
}

type CredentialProps = {
  idPrefix: string;
  disabled: boolean;
  required: boolean;
  username: string;
  password: string;
  update: (value: { username?: string; password?: string }) => void;
};

function databaseKindLabel(kind: MetadataDatabaseKind) {
  if (kind === 'h2') return 'H2';
  if (kind === 'mysql') return 'MySQL';
  return 'PostgreSQL';
}

function SectionHeading({ id, title, description }: { id: string; title: string; description: string }) {
  return (
    <header className={styles.heading}>
      <Typography.Title id={id} level={3}>
        {title}
      </Typography.Title>
      <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
    </header>
  );
}
