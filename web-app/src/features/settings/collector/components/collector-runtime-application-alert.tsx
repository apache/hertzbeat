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

import { Alert, type AlertProps } from 'antd';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import type { CollectorRuntimeSaveState } from '../model/collector-runtime-report-model';

export function CollectorRuntimeApplicationAlert({ state }: { state: CollectorRuntimeSaveState | null }) {
  const { t } = useTranslation();
  if (!state) return null;
  const content = alertContent(state, t);
  return <Alert showIcon type={content.type} message={content.message} />;
}

type AlertContent = {
  message: AlertProps['message'];
  type: NonNullable<AlertProps['type']>;
};

function alertContent(state: CollectorRuntimeSaveState, t: TFunction): AlertContent {
  const application = state.application;
  if (application.kind === 'applied') {
    return {
      type: application.state === 'RUNNING' ? 'success' : 'warning',
      message: t('collectors.runtime.application.applied', {
        collector: state.collector,
        revision: application.revision,
        state: t(`collectors.runtime.report.state.${application.state}`)
      })
    };
  }
  if (application.kind === 'rejected') {
    return {
      type: 'error',
      message: t('collectors.runtime.application.rejected', {
        collector: state.collector,
        revision: application.expectedRevision,
        activeRevision: application.activeRevision,
        failureCode: application.failureCode
      })
    };
  }
  if (application.kind === 'superseded') {
    return {
      type: 'warning',
      message: t('collectors.runtime.application.superseded', {
        collector: state.collector,
        revision: application.expectedRevision,
        desiredRevision: application.desiredRevision
      })
    };
  }
  if (application.kind === 'waiting') {
    return {
      type: 'info',
      message: t('collectors.runtime.application.waiting', {
        collector: state.collector,
        revision: application.expectedRevision,
        desiredRevision: application.desiredRevision,
        activeRevision: application.activeRevision
      })
    };
  }
  return {
    type: 'info',
    message: t(`collectors.runtime.application.unknown.${application.reason}`, {
      collector: state.collector,
      revision: application.expectedRevision
    })
  };
}
