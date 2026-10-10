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

import { useCreate, useNotification, useUpdate, type HttpError } from '@refinedev/core';
import { useCallback } from 'react';
import type { useTranslation } from 'react-i18next';

import type { ExclusiveOperation } from '@/shared/exclusive-operation';

import { createLabelWriteEvidence, type LabelMutationEvidence } from '../model/label-failure';
import { buildLabelExpectedWrite, labelResourceName, type LabelRecord } from '../model/label-model';
import { useLabelSaveRecoveryController } from './label-save-recovery-controller';

const listInvalidation = ['list'] as const;
type Translate = ReturnType<typeof useTranslation>['t'];

export function useLabelSaveMutationController(
  operation: ExclusiveOperation,
  notification: ReturnType<typeof useNotification>,
  t: Translate,
  convergeProjection: (evidence: LabelMutationEvidence) => Promise<boolean>
) {
  const create = useCreate<LabelRecord, HttpError, Partial<LabelRecord>>(saveMutationOptions());
  const update = useUpdate<LabelRecord, HttpError, Partial<LabelRecord>>({
    ...saveMutationOptions(),
    mutationMode: 'pessimistic'
  });
  const recovery = useLabelSaveRecoveryController({
    convergeProjection,
    operation,
    notifyFailure: () => notification.open?.({ message: t('labels.saveFailed'), type: 'error' }),
    notifySuccess: () => notification.open?.({ message: t('labels.saveSuccess'), type: 'success' }),
    notifyDeleteFailure: () => notification.open?.({ message: t('labels.deleteFailed'), type: 'error' }),
    notifyDeleteSuccess: () => notification.open?.({ message: t('labels.deleteSuccess'), type: 'success' })
  });
  const createLabel = useCreateLabel(create, recovery, operation);
  const updateLabel = useUpdateLabel(update, recovery, operation, notification, t);
  return {
    createLabel,
    isInFlight: recovery.isInFlight,
    isLocked: recovery.isLocked,
    isSaving: operation.pending || create.mutation.isPending || update.mutation.isPending,
    recovery: recovery.recovery,
    recoveryCommand: recovery.recoveryCommand,
    retryMutationProof: recovery.retry,
    recoveryController: recovery,
    updateLabel
  };
}

function useCreateLabel(
  create: ReturnType<typeof useCreate<LabelRecord, HttpError, Partial<LabelRecord>>>,
  recovery: ReturnType<typeof useLabelSaveRecoveryController>,
  operation: ExclusiveOperation
) {
  return useCallback(
    (values: Partial<LabelRecord>, onConfirmed: () => void) => {
      if (recovery.isLocked()) return false;
      const owner = operation.begin();
      if (!owner) return false;
      const expected = buildLabelExpectedWrite(values, 'create');
      create.mutate(
        createLabelParams(values),
        recovery.saveCallbacks(
          owner,
          createLabelWriteEvidence('create', 'write', 'commit-uncertain', expected),
          onConfirmed
        )
      );
      return true;
    },
    [create, operation, recovery]
  );
}

function useUpdateLabel(
  update: ReturnType<typeof useUpdate<LabelRecord, HttpError, Partial<LabelRecord>>>,
  recovery: ReturnType<typeof useLabelSaveRecoveryController>,
  operation: ExclusiveOperation,
  notification: ReturnType<typeof useNotification>,
  t: Translate
) {
  return useCallback(
    (record: LabelRecord, values: Partial<LabelRecord>, onConfirmed: () => void) => {
      if (record.id === undefined) {
        notification.open?.({ message: t('labels.saveFailed'), type: 'error' });
        return false;
      }
      if (recovery.isLocked()) return false;
      const owner = operation.begin();
      if (!owner) return false;
      const expected = buildLabelExpectedWrite({ ...record, ...values, id: record.id }, 'update');
      update.mutate(
        updateLabelParams(record, values),
        recovery.saveCallbacks(owner, createLabelWriteEvidence('update', 'write', 'proof', expected), onConfirmed)
      );
      return true;
    },
    [notification, operation, recovery, t, update]
  );
}

function saveMutationOptions() {
  return {
    resource: labelResourceName,
    dataProviderName: labelResourceName,
    invalidates: [...listInvalidation],
    successNotification: false as const,
    errorNotification: false as const
  };
}

function createLabelParams(values: Partial<LabelRecord>) {
  return {
    resource: labelResourceName,
    dataProviderName: labelResourceName,
    invalidates: [...listInvalidation],
    values
  };
}

function updateLabelParams(record: LabelRecord, values: Partial<LabelRecord>) {
  return {
    id: record.id,
    resource: labelResourceName,
    dataProviderName: labelResourceName,
    invalidates: [...listInvalidation],
    mutationMode: 'pessimistic' as const,
    values: { ...record, ...values, id: record.id }
  };
}
