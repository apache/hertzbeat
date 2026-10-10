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

import { Alert, Button, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { SetupErrorCode } from '../model/setup-contract';
import type { SetupExportFormat } from '../model/setup-configuration';
import type { SetupRequestFailure } from '../model/setup-configuration-state';
import styles from './setup-configuration-form.module.css';
import { generalSetupErrorKey } from './setup-error-message';

const workflowClass = styles.workflow ?? '';

export function SetupConfigurationExport(props: Props) {
  const { t } = useTranslation();
  if (!props.canExport) return null;
  return (
    <section aria-labelledby="setup-export-title">
      <Typography.Title id="setup-export-title" level={3}>
        {t('setup.configuration.export.title')}
      </Typography.Title>
      <Typography.Paragraph type="secondary">{t('setup.configuration.export.description')}</Typography.Paragraph>
      {props.exportFailure && (
        <Alert className={workflowClass} type="error" showIcon message={t(exportFailureKey(props.exportFailure))} />
      )}
      <Space wrap>
        <ExportButton format="yaml" label={t('setup.configuration.export.yaml')} {...props} />
        <ExportButton format="env" label={t('setup.configuration.export.env')} {...props} />
        <ExportButton format="kubernetes_secret" label={t('setup.configuration.export.kubernetesSecret')} {...props} />
      </Space>
    </section>
  );
}

type Props = {
  canExport: boolean;
  exporting: boolean;
  exportFailure: SetupRequestFailure | null;
  exportConfiguration: (format: SetupExportFormat) => Promise<void>;
};

function ExportButton({
  format,
  label,
  exporting,
  exportConfiguration
}: Props & { format: SetupExportFormat; label: string }) {
  return (
    <Button loading={exporting} disabled={exporting} onClick={() => void exportConfiguration(format)}>
      {label}
    </Button>
  );
}

function exportFailureKey(failure: SetupRequestFailure) {
  const errorKey = exportErrorCodeKey(failure.errorCode);
  if (errorKey) return errorKey;
  if (failure.failure === 'unavailable') return 'setup.configuration.export.unavailable';
  if (failure.failure === 'contract') return 'setup.configuration.export.contract';
  return 'setup.configuration.export.failed';
}

function exportErrorCodeKey(errorCode: SetupErrorCode | null) {
  const generalKey = generalSetupErrorKey(errorCode);
  if (generalKey) return generalKey;
  if (errorCode === 'config_read_only') return 'setup.configuration.configReadOnly';
  if (errorCode === 'config_recovery_required') return 'setup.configuration.configRecoveryRequired';
  if (errorCode === 'operation_conflict') return 'setup.configuration.operationConflict';
  return null;
}
