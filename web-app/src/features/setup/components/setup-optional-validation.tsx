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
