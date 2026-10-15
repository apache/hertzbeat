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

import { useDelete, useDeleteMany, useNotification, type HttpError } from '@refinedev/core';
import { useCallback, useRef, type MutableRefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { useExclusiveOperation, type ExclusiveOperation } from '@/shared/exclusive-operation';

import {
  createLabelDeleteEvidence,
  createLabelDeleteManyEvidence,
  type LabelMutationEvidence
} from '../model/label-failure';
import { labelResourceName, type LabelActionCapabilities, type LabelRecord } from '../model/label-model';
import { useLabelSaveMutationController } from './label-save-mutation-controller';
import type { LabelSaveRecoveryController } from './label-save-recovery-controller';

const listInvalidation = ['list'] as const;
type Translate = ReturnType<typeof useTranslation>['t'];

export function useLabelMutationController(
  convergeProjection: (evidence: LabelMutationEvidence) => Promise<boolean>,
  onDeleteConfirmed: (deletedRecords: number) => void,
  capabilities: LabelActionCapabilities
) {
  const { t } = useTranslation();
  const notification = useNotification();
  const remove = useDelete<LabelRecord, HttpError, LabelRecord>();
  const removeMany = useDeleteMany<LabelRecord, HttpError, LabelRecord[]>();
  const operation = useExclusiveOperation('label-mutation');
  const save = useLabelSaveMutationController(operation, notification, t, convergeProjection);
  const confirmedDeletedIdsRef = useRef(new Set<number>());
  const deleteLabel = useDeleteLabel(
    remove,
    operation,
    save.recoveryController,
    notification,
    t,
    onDeleteConfirmed,
    capabilities.canDelete,
    confirmedDeletedIdsRef
  );
  const deleteLabels = useDeleteLabels(
    removeMany,
    operation,
    save.recoveryController,
    onDeleteConfirmed,
    capabilities.canDelete,
    confirmedDeletedIdsRef
  );

  return {
    createLabel: (...args: Parameters<typeof save.createLabel>) =>
      capabilities.canCreate ? save.createLabel(...args) : false,
    deleteLabel,
    deleteLabels,
    isInFlight: save.isInFlight,
    isLocked: save.isLocked,
    isSaving: save.isSaving || remove.mutation.isPending || removeMany.mutation.isPending,
    recovery: save.recovery,
    recoveryCommand: save.recoveryCommand,
    retryMutationProof: save.retryMutationProof,
    updateLabel: (...args: Parameters<typeof save.updateLabel>) =>
      capabilities.canUpdate ? save.updateLabel(...args) : false
  };
}

function useDeleteLabel(
  remove: ReturnType<typeof useDelete<LabelRecord, HttpError, LabelRecord>>,
  operation: ExclusiveOperation,
  recovery: LabelSaveRecoveryController,
  notification: ReturnType<typeof useNotification>,
  t: Translate,
  onDeleteConfirmed: (deletedRecords: number) => void,
  canDelete: boolean,
  confirmedDeletedIdsRef: MutableRefObject<Set<number>>
) {
  return useCallback(
    (record: LabelRecord) => {
      if (!canDelete) return false;
      const id = record.id;
      if (id === undefined) {
        notification.open?.({ message: t('labels.deleteFailed'), type: 'error' });
        return false;
      }
      if (confirmedDeletedIdsRef.current.has(id)) return false;
      if (recovery.isLocked()) return false;
      const owner = operation.begin();
      if (!owner) return false;
      remove.mutate(
        deleteLabelParams(record),
        recovery.deleteCallbacks(owner, createLabelDeleteEvidence('write', 'proof', record), () => {
          confirmedDeletedIdsRef.current.add(id);
          onDeleteConfirmed(1);
        })
      );
      return true;
    },
    [canDelete, confirmedDeletedIdsRef, notification, onDeleteConfirmed, operation, recovery, remove, t]
  );
}

function useDeleteLabels(
  remove: ReturnType<typeof useDeleteMany<LabelRecord, HttpError, LabelRecord[]>>,
  operation: ExclusiveOperation,
  recovery: LabelSaveRecoveryController,
  onDeleteConfirmed: (deletedRecords: number) => void,
  canDelete: boolean,
  confirmedDeletedIdsRef: MutableRefObject<Set<number>>
) {
  return useCallback(
    (records: LabelRecord[], onConfirmed?: () => void) => {
      const ids = records.map(record => record.id);
      if (
        !canDelete ||
        records.length === 0 ||
        ids.some(id => !Number.isSafeInteger(id) || id < 1) ||
        new Set(ids).size !== ids.length ||
        ids.some(id => confirmedDeletedIdsRef.current.has(id)) ||
        recovery.isLocked()
      ) {
        return false;
      }
      const owner = operation.begin();
      if (!owner) return false;
      remove.mutate(
        deleteLabelsParams(records),
        recovery.deleteCallbacks(owner, createLabelDeleteManyEvidence('write', 'proof', records), () => {
          ids.forEach(id => confirmedDeletedIdsRef.current.add(id));
          onDeleteConfirmed(records.length);
          onConfirmed?.();
        })
      );
      return true;
    },
    [canDelete, confirmedDeletedIdsRef, onDeleteConfirmed, operation, recovery, remove]
  );
}

function deleteLabelParams(record: LabelRecord) {
  return {
    id: record.id,
    resource: labelResourceName,
    dataProviderName: labelResourceName,
    invalidates: [...listInvalidation],
    mutationMode: 'pessimistic' as const,
    values: record,
    successNotification: false as const,
    errorNotification: false as const
  };
}

function deleteLabelsParams(records: LabelRecord[]) {
  return {
    ids: records.map(record => record.id),
    resource: labelResourceName,
    dataProviderName: labelResourceName,
    invalidates: [...listInvalidation],
    mutationMode: 'pessimistic' as const,
    values: records,
    successNotification: false as const,
    errorNotification: false as const
  };
}
