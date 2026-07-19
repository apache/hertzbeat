/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useUpdate, type HttpError } from '@refinedev/core';
import { useCallback, useState } from 'react';

import { useExclusiveOperation, type ExclusiveOperation } from '@/shared/exclusive-operation';

import {
  createObjectStoreDraft,
  isObjectStoreDirty,
  objectStoreResourceId,
  validateObjectStoreDraft,
  type ObjectStoreDraft,
  type ObjectStoreResourceRecord
} from '../model/object-store-model';

type ObjectStoreUpdate = ReturnType<typeof useUpdate<ObjectStoreResourceRecord, HttpError, ObjectStoreDraft>>;

export function useObjectStoreEditorController(
  record: ObjectStoreResourceRecord | undefined,
  refetch: () => unknown,
  update: ObjectStoreUpdate
) {
  const [draft, setDraft] = useState<ObjectStoreDraft | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const operation = useExclusiveOperation('object-store-save');
  const baseline = createObjectStoreDraft(record);
  const current = draft ?? baseline;
  const missingFields = validateObjectStoreDraft(current);
  const dirty = draft !== null && isObjectStoreDirty(draft, baseline);
  const updateDraft = useCallback(
    (next: ObjectStoreDraft) => {
      if (operation.isLocked()) return;
      setDraft(next);
      setShowValidation(false);
    },
    [operation]
  );
  const discard = useCallback(() => {
    if (operation.isLocked()) return;
    setDraft(null);
    setShowValidation(false);
  }, [operation]);
  const retry = useCallback(() => {
    if (!operation.isLocked()) void refetch();
  }, [operation, refetch]);
  const submit = useObjectStoreSubmit({
    current,
    dirty,
    missingFields,
    operation,
    setDraft,
    setShowValidation,
    update
  });
  return {
    discard,
    retry,
    state: {
      current,
      dirty,
      missingFields,
      saving: operation.pending || update.mutation.isPending,
      showValidation
    },
    submit,
    updateDraft
  };
}

function useObjectStoreSubmit({
  current,
  dirty,
  missingFields,
  operation,
  setDraft,
  setShowValidation,
  update
}: {
  current: ObjectStoreDraft;
  dirty: boolean;
  missingFields: string[];
  operation: ExclusiveOperation;
  setDraft: (draft: ObjectStoreDraft | null) => void;
  setShowValidation: (show: boolean) => void;
  update: ObjectStoreUpdate;
}) {
  return useCallback(() => {
    if (missingFields.length > 0) {
      setShowValidation(true);
      return;
    }
    if (!dirty) return;
    const owner = operation.begin();
    if (!owner) return;
    update.mutate(
      {
        id: objectStoreResourceId,
        resource: 'object-store',
        dataProviderName: 'object-store',
        invalidates: ['detail'],
        mutationMode: 'pessimistic',
        values: current
      },
      {
        onSuccess: () => {
          if (!operation.isCurrent(owner)) return;
          setDraft(null);
          setShowValidation(false);
          operation.end(owner);
        },
        onError: () => operation.end(owner)
      }
    );
  }, [current, dirty, missingFields.length, operation, setDraft, setShowValidation, update]);
}
