/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useTranslation } from 'react-i18next';
import { OperationalStatePanel } from '@/shared/operational-page';
import type { ServicesViewProps } from '../model/services-model';
import { ServiceRedEvidence, ServiceOperations } from './service-signal-evidence';

export function ServiceOverview({ state, actions }: ServicesViewProps) {
  const { t } = useTranslation();
  if (state.detail.kind === 'idle')
    return (
      <OperationalStatePanel
        kind="empty"
        presentation="quiet"
        title={t('services.select')}
        description={t('services.unresolved')}
      />
    );
  if (state.detail.kind !== 'ready')
    return (
      <OperationalStatePanel
        kind={state.detail.kind === 'missing' ? 'empty' : state.detail.kind === 'invalid' ? 'error' : state.detail.kind}
        presentation="quiet"
        title={t(`services.state.${state.detail.kind}`)}
      />
    );
  return (
    <>
      <ServiceRedEvidence state={state} />
      <ServiceOperations state={state} actions={actions} />
    </>
  );
}
