/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert } from 'antd';
import { useTranslation } from 'react-i18next';

/** Reports an unverified write without claiming that the server accepted or rejected it. */
export function StatusWriteRecoveryAlert() {
  const { t } = useTranslation();
  return <Alert type="warning" showIcon message={t('statusManagement.unknown')} />;
}
