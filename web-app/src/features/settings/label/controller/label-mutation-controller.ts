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

import { useDelete, useNotification, type HttpError } from '@refinedev/core';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useExclusiveOperation, type ExclusiveOperation } from '@/shared/exclusive-operation';

import { createLabelDeleteEvidence, type LabelMutationEvidence } from '../model/label-failure';
import type { LabelRecord } from '../model/label-model';
import { useLabelSaveMutationController } from './label-save-mutation-controller';
import type { LabelSaveRecoveryController } from './label-save-recovery-controller';

const labelResource = 'labels';
const labelDataProvider = 'labels';
const listInvalidation = ['list'] as const;
type Translate = ReturnType<typeof useTranslation>['t'];

export function useLabelMutationController(
  convergeProjection: (evidence: LabelMutationEvidence) => Promise<boolean>,
  onDeleteConfirmed: () => void
) {
  const { t } = useTranslation();
  const notification = useNotification();
  const remove = useDelete<LabelRecord, HttpError, LabelRecord>();
  const operation = useExclusiveOperation('label-mutation');
  const save = useLabelSaveMutationController(operation, notification, t, convergeProjection);
  const deleteLabel = useDeleteLabel(remove, operation, save.recoveryController, notification, t, onDeleteConfirmed);

  return {
    createLabel: save.createLabel,
    deleteLabel,
    isInFlight: save.isInFlight,
    isLocked: save.isLocked,
    isSaving: save.isSaving || remove.mutation.isPending,
    recovery: save.recovery,
    recoveryCommand: save.recoveryCommand,
    retryMutationProof: save.retryMutationProof,
    updateLabel: save.updateLabel
  };
}

function useDeleteLabel(
  remove: ReturnType<typeof useDelete<LabelRecord, HttpError, LabelRecord>>,
  operation: ExclusiveOperation,
  recovery: LabelSaveRecoveryController,
  notification: ReturnType<typeof useNotification>,
  t: Translate,
  onDeleteConfirmed: () => void
) {
  // Provider proof can precede list projection, so retire IDs from stale table rows.
  const confirmedDeletedIdsRef = useRef(new Set<number>());
  return useCallback(
    (record: LabelRecord) => {
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
          onDeleteConfirmed();
        })
      );
      return true;
    },
    [notification, onDeleteConfirmed, operation, recovery, remove, t]
  );
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
