/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert } from 'antd';
import { useTranslation } from 'react-i18next';

import type { SetupErrorCode } from '../model/setup-contract';
import type { SetupValidationSection } from '../model/setup-configuration';
import type { SetupSectionValidationMap } from '../model/setup-configuration-state';
import styles from './setup-configuration-form.module.css';
import { generalSetupErrorKey } from './setup-error-message';

const evidenceClass = styles.evidence ?? '';

export function SetupValidationEvidence({
  section,
  validation
}: {
  section: SetupValidationSection;
  validation: SetupSectionValidationMap[SetupValidationSection];
}) {
  const { t } = useTranslation();
  if (validation.state === 'idle' || validation.state === 'checking') return null;
  if (validation.state === 'complete' && validation.valid) {
    return (
      <Alert className={evidenceClass} type="success" showIcon message={t('setup.configuration.validationSucceeded')} />
    );
  }
  return <Alert className={evidenceClass} type="error" showIcon message={t(errorKey(section, validation.errorCode))} />;
}

function errorKey(section: SetupValidationSection, errorCode: SetupErrorCode | null) {
  const generalKey = generalSetupErrorKey(errorCode);
  if (generalKey) return generalKey;
  if (errorCode === 'metadata_connection_failed') return 'setup.configuration.management.connectionFailed';
  if (errorCode === 'metadata_kind_unsupported') return 'setup.configuration.management.kindUnsupported';
  if (errorCode === 'metadata_schema_mismatch') return 'setup.configuration.management.schemaMismatch';
  if (errorCode === 'metadata_insufficient_privileges') {
    return 'setup.configuration.management.insufficientPrivileges';
  }
  if (errorCode === 'telemetry_connection_failed') return 'setup.configuration.telemetry.connectionFailed';
  return section === 'metadata_database'
    ? 'setup.configuration.management.validationFailed'
    : 'setup.configuration.telemetry.validationFailed';
}
