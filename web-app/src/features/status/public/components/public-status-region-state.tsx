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
