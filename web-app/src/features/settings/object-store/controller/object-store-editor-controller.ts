/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useState } from 'react';

import {
  createObjectStoreDraft,
  isObjectStoreDirty,
  validateObjectStoreDraft,
  type ObjectStoreDraft,
  type ObjectStoreResourceRecord
} from '../model/object-store-model';
import {
  useObjectStoreSaveTransaction,
  type ObjectStoreCanonicalRead,
  type ObjectStoreMutation,
  type ObjectStoreSaveNotifications
} from './object-store-save-transaction';

export function useObjectStoreEditorController(
  record: ObjectStoreResourceRecord | undefined,
  reread: ObjectStoreCanonicalRead,
  update: ObjectStoreMutation,
  notifications: ObjectStoreSaveNotifications
) {
  const [draft, setDraft] = useState<ObjectStoreDraft | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const baseline = createObjectStoreDraft(record);
  const current = draft ?? baseline;
  const missingFields = validateObjectStoreDraft(current);
  const dirty = draft !== null && isObjectStoreDirty(draft, baseline);
  const transaction = useObjectStoreSaveTransaction({
    accept: () => {
      setDraft(null);
      setShowValidation(false);
    },
    mutation: update,
    reread,
    ...notifications
  });
  const updateDraft = (next: ObjectStoreDraft) => {
    if (transaction.isLocked()) return;
    setDraft(next);
    setShowValidation(false);
  };
  const discard = () => {
    if (transaction.isLocked()) return;
    setDraft(null);
    setShowValidation(false);
  };
  const retry = async () => {
    if (transaction.recovery) return transaction.retry();
    if (!transaction.isLocked()) await reread();
  };
  const submit = () => {
    if (missingFields.length > 0) {
      setShowValidation(true);
      return;
    }
    if (dirty) transaction.submit(current);
  };
  return {
    discard,
    retry,
    state: {
      current,
      dirty,
      locked: transaction.isLocked(),
      missingFields,
      proving: transaction.proving,
      recovery: transaction.recovery,
      saving: transaction.saving,
      showValidation
    },
    submit,
    updateDraft
  };
}
