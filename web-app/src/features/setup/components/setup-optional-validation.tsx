/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Space } from 'antd';
import { useTranslation } from 'react-i18next';

import { setupOptionalWarningKey } from '@/shared/setup-warning';

import type { SetupOptionalValidationEvidence } from '../model/setup-optional';

export function SetupOptionalValidation({ evidence }: { evidence: SetupOptionalValidationEvidence }) {
  const { t } = useTranslation();
  if (!evidence || evidence.state === 'checking') return null;
  if (evidence.state === 'failed')
    return <Alert type="error" showIcon message={t(`setup.optional.validation.${evidence.failure}`)} />;
  if (!evidence.valid) return <Alert type="error" showIcon message={t(validationFailureKey(evidence.errorCode))} />;
  return (
    <Space direction="vertical">
      <Alert type="success" showIcon message={t('setup.optional.validation.succeeded')} />
      {evidence.warnings.map(warning => (
        <Alert key={warning} type="warning" showIcon message={t(setupOptionalWarningKey(warning))} />
      ))}
    </Space>
  );
}

function validationFailureKey(errorCode: string | null) {
  if (errorCode === 'public_address_invalid') return 'setup.optional.validation.publicAddressInvalid';
  if (errorCode === 'mail_connection_failed') return 'setup.optional.validation.mailConnectionFailed';
  return 'setup.optional.validation.failed';
}
