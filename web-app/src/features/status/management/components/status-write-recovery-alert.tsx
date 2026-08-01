/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

/** Reports an unverified write without claiming that the server accepted or rejected it. */
export function StatusWriteRecoveryAlert() {
  const { t } = useTranslation();
  return <OperationalStatePanel kind="unavailable" title={t('statusManagement.unknown')} />;
}
