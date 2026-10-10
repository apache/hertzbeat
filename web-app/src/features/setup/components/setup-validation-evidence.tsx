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
