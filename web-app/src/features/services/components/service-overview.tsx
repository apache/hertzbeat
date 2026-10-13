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
