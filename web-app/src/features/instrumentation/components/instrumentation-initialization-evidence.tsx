/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';
import type { InstrumentationMetadataState } from '../model/instrumentation-initialization';

type Props = {
  catalogState: InstrumentationMetadataState;
  profilesState: InstrumentationMetadataState;
  retrying: boolean;
  onRetry: () => void;
};

export function InstrumentationInitializationEvidence(props: Props) {
  const { t } = useTranslation();
  const retry = (
    <Button aria-label={t('common.retry')} disabled={props.retrying} loading={props.retrying} onClick={props.onRetry}>
      {t('common.retry')}
    </Button>
  );
  if (props.catalogState === 'initial-loading') {
    return <OperationalStatePanel kind="loading" title={t('instrumentation.v2.initialization.catalogLoading')} />;
  }
  if (props.catalogState === 'retrying') {
    return (
      <OperationalStatePanel
        kind="loading"
        title={t('instrumentation.v2.initialization.catalogRetrying')}
        action={retry}
      />
    );
  }
  if (props.catalogState === 'error') {
    return (
      <OperationalStatePanel
        kind="unavailable"
        title={t('instrumentation.v2.initialization.catalogUnavailable')}
        description={t('instrumentation.v2.initialization.catalogUnavailableDescription')}
        action={retry}
      />
    );
  }
  if (props.profilesState === 'initial-loading') {
    return <Alert type="info" showIcon message={t('instrumentation.v2.initialization.profilesLoading')} />;
  }
  if (props.profilesState === 'retrying') {
    return (
      <Alert type="info" showIcon message={t('instrumentation.v2.initialization.profilesRetrying')} action={retry} />
    );
  }
  if (props.profilesState === 'error') {
    return (
      <Alert
        type="error"
        showIcon
        message={t('instrumentation.v2.initialization.profilesUnavailable')}
        description={t('instrumentation.v2.initialization.profilesUnavailableDescription')}
        action={retry}
      />
    );
  }
  if (props.catalogState === 'stale' || props.profilesState === 'stale') {
    return (
      <Alert
        type="warning"
        showIcon
        message={t('instrumentation.v2.initialization.stale')}
        description={t('instrumentation.v2.initialization.staleDescription')}
        action={retry}
      />
    );
  }
  return null;
}
