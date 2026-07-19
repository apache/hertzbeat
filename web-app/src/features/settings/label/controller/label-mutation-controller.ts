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
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useExclusiveOperation, type ExclusiveOperation } from '@/shared/exclusive-operation';

import type { LabelRecord } from '../model/label-model';

const labelResource = 'labels';
const labelDataProvider = 'labels';
const listInvalidation = ['list'] as const;
type Translate = ReturnType<typeof useTranslation>['t'];

export function useLabelMutationController() {
  const { t } = useTranslation();
  const notification = useNotification();
  const create = useCreate<LabelRecord, HttpError, Partial<LabelRecord>>(saveMutationOptions());
  const update = useUpdate<LabelRecord, HttpError, Partial<LabelRecord>>({
    ...saveMutationOptions(),
    mutationMode: 'pessimistic'
  });
  const remove = useDelete<LabelRecord, HttpError, LabelRecord>();
  const operation = useExclusiveOperation('label-mutation');

  const createLabel = useCallback(
    (values: Partial<LabelRecord>, onConfirmed: () => void) => {
      const owner = operation.begin();
      if (!owner) return false;
      create.mutate(createLabelParams(values), ownedCallbacks(operation, owner, notification, t, 'save', onConfirmed));
      return true;
    },
    [create, notification, operation, t]
  );

  const updateLabel = useCallback(
    (record: LabelRecord, values: Partial<LabelRecord>, onConfirmed: () => void) => {
      if (record.id === undefined) {
        notification.open?.(notice(t('labels.saveFailed'), 'error'));
        return false;
      }
      const owner = operation.begin();
      if (!owner) return false;
      update.mutate(
        updateLabelParams(record, values),
        ownedCallbacks(operation, owner, notification, t, 'save', onConfirmed)
      );
      return true;
    },
    [notification, operation, t, update]
  );
  const deleteLabel = useDeleteLabel(remove, operation, notification, t);

  return {
    createLabel,
    deleteLabel,
    isLocked: operation.isLocked,
    isSaving: operation.pending || create.mutation.isPending || update.mutation.isPending || remove.mutation.isPending,
    updateLabel
  };
}

function useDeleteLabel(
  remove: ReturnType<typeof useDelete<LabelRecord, HttpError, LabelRecord>>,
  operation: ExclusiveOperation,
  notification: ReturnType<typeof useNotification>,
  t: Translate
) {
  // Provider proof can precede list projection, so retire IDs from stale table rows.
  const confirmedDeletedIdsRef = useRef(new Set<number>());
  return useCallback(
    (record: LabelRecord) => {
      const id = record.id;
      if (id === undefined) {
        notification.open?.(notice(t('labels.deleteFailed'), 'error'));
        return false;
      }
      if (confirmedDeletedIdsRef.current.has(id)) return false;
      const owner = operation.begin();
      if (!owner) return false;
      remove.mutate(
        deleteLabelParams(record),
        ownedCallbacks(operation, owner, notification, t, 'delete', () => confirmedDeletedIdsRef.current.add(id))
      );
      return true;
    },
    [notification, operation, remove, t]
  );
}

function saveMutationOptions() {
  return {
    resource: labelResource,
    dataProviderName: labelDataProvider,
    invalidates: [...listInvalidation],
    successNotification: false as const,
    errorNotification: false as const
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

function deleteLabelParams(record: LabelRecord) {
  return {
    id: record.id,
    resource: labelResource,
    dataProviderName: labelDataProvider,
    invalidates: [...listInvalidation],
    mutationMode: 'pessimistic' as const,
    values: record,
    successNotification: false as const,
    errorNotification: false as const
  };
}

type LabelOperationOwner = NonNullable<ReturnType<ExclusiveOperation['begin']>>;

function ownedCallbacks(
  operation: ExclusiveOperation,
  owner: LabelOperationOwner,
  notification: ReturnType<typeof useNotification>,
  t: Translate,
  command: 'save' | 'delete',
  onConfirmed: () => void
) {
  const successKey = command === 'save' ? 'labels.saveSuccess' : 'labels.deleteSuccess';
  const failureKey = command === 'save' ? 'labels.saveFailed' : 'labels.deleteFailed';
  return {
    onSuccess: () =>
      finishOwned(operation, owner, () => {
        onConfirmed();
        notification.open?.(notice(t(successKey), 'success'));
      }),
    onError: () =>
      finishOwned(operation, owner, () => {
        notification.open?.(notice(t(failureKey), 'error'));
      })
  };
}

function finishOwned(operation: ExclusiveOperation, owner: LabelOperationOwner, publish: () => void) {
  if (!operation.isCurrent(owner)) return;
  try {
    publish();
  } finally {
    operation.end(owner);
  }
}

function notice(message: string, type: OpenNotificationParams['type']): OpenNotificationParams {
  return { message, type };
}
