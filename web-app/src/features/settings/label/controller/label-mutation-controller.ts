/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  useCreate,
  useDelete,
  useNotification,
  useUpdate,
  type HttpError,
  type OpenNotificationParams
} from '@refinedev/core';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { LabelRecord } from '../model/label-model';

const labelResource = 'labels';
const labelDataProvider = 'labels';
const listInvalidation = ['list'] as const;
type Translate = ReturnType<typeof useTranslation>['t'];

export function useLabelMutationController() {
  const { t } = useTranslation();
  const notification = useNotification();
  const create = useCreate<LabelRecord, HttpError, Partial<LabelRecord>>(saveMutationOptions(t));
  const update = useUpdate<LabelRecord, HttpError, Partial<LabelRecord>>({
    ...saveMutationOptions(t),
    mutationMode: 'pessimistic'
  });
  const remove = useDelete<LabelRecord, HttpError, LabelRecord>();

  const createLabel = useCallback(
    (values: Partial<LabelRecord>, onSuccess: () => void) => {
      create.mutate(createLabelParams(values), { onSuccess });
    },
    [create]
  );

  const updateLabel = useCallback(
    (record: LabelRecord, values: Partial<LabelRecord>, onSuccess: () => void) => {
      if (record.id === undefined) {
        notification.open?.(notice(t('labels.saveFailed'), 'error'));
        return;
      }
      update.mutate(updateLabelParams(record, values), { onSuccess });
    },
    [notification, t, update]
  );

  const deleteLabel = useCallback(
    (record: LabelRecord) => {
      if (record.id === undefined) {
        notification.open?.(notice(t('labels.deleteFailed'), 'error'));
        return;
      }
      remove.mutate(deleteLabelParams(record, t));
    },
    [notification, remove, t]
  );

  return {
    createLabel,
    deleteLabel,
    isSaving: create.mutation.isPending || update.mutation.isPending,
    updateLabel
  };
}

function saveMutationOptions(t: Translate) {
  return {
    resource: labelResource,
    dataProviderName: labelDataProvider,
    invalidates: [...listInvalidation],
    successNotification: () => notice(t('labels.saveSuccess'), 'success'),
    errorNotification: () => notice(t('labels.saveFailed'), 'error')
  };
}

function createLabelParams(values: Partial<LabelRecord>) {
  return { resource: labelResource, dataProviderName: labelDataProvider, invalidates: [...listInvalidation], values };
}

function updateLabelParams(record: LabelRecord, values: Partial<LabelRecord>) {
  return {
    id: record.id,
    resource: labelResource,
    dataProviderName: labelDataProvider,
    invalidates: [...listInvalidation],
    mutationMode: 'pessimistic' as const,
    values: { ...record, ...values, id: record.id }
  };
}

function deleteLabelParams(record: LabelRecord, t: Translate) {
  return {
    id: record.id,
    resource: labelResource,
    dataProviderName: labelDataProvider,
    invalidates: [...listInvalidation],
    mutationMode: 'pessimistic' as const,
    values: record,
    successNotification: () => notice(t('labels.deleteSuccess'), 'success'),
    errorNotification: () => notice(t('labels.deleteFailed'), 'error')
  };
}

function notice(message: string, type: OpenNotificationParams['type']): OpenNotificationParams {
  return { message, type };
}
