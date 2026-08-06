/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

import type { PublicStatusState } from '../model/public-status-contract';

export function PublicStatusRegionState({
  state,
  loadingKey
}: {
  state: Exclude<PublicStatusState, 'ready' | 'empty'>;
  loadingKey: 'status.loading' | 'status.loadingIncidents';
}) {
  const { t } = useTranslation();
  if (state === 'loading') return <OperationalStatePanel kind="loading" title={t(loadingKey)} />;
  if (state === 'unconfigured') return <OperationalStatePanel kind="empty" title={t('status.notConfigured')} />;
  if (state === 'unavailable') return <OperationalStatePanel kind="unavailable" title={t('common.unavailable')} />;
  if (state === 'permission') return <OperationalStatePanel kind="permission" title={t('status.permission')} />;
  if (state === 'invalid') return <OperationalStatePanel kind="error" title={t('status.invalid')} />;
  return <OperationalStatePanel kind="error" title={t('common.routeError.description')} />;
}
