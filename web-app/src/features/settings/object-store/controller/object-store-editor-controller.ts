/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

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
  notifications: ObjectStoreSaveNotifications,
  canWrite: boolean
) {
  const [draft, setDraft] = useState<ObjectStoreDraft | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const canonical = useAcceptedObjectStoreBaseline(record);
  const current = draft ?? canonical.baseline;
  const missingFields = validateObjectStoreDraft(current);
  const dirty = draft !== null && isObjectStoreDirty(draft, canonical.baseline);
  const transaction = useObjectStoreSaveTransaction({
    accept: value => {
      canonical.accept(value);
      setDraft(null);
      setShowValidation(false);
    },
    mutation: update,
    reread,
    ...notifications
  });
  useRetireObjectStoreWriteAccess(canWrite, transaction.retireWriteAccess, setDraft, setShowValidation);
  const updateDraft = (next: ObjectStoreDraft) => {
    if (!canWrite || transaction.isLocked()) return;
    setDraft(next);
    setShowValidation(false);
  };
  const discard = () => {
    if (!canWrite || transaction.isLocked()) return;
    setDraft(null);
    setShowValidation(false);
  };
  const retry = async () => {
    if (transaction.recovery) return canWrite ? transaction.retry() : undefined;
    if (!transaction.isLocked()) await reread();
  };
  const submit = () => {
    if (!canWrite) return;
    if (missingFields.length > 0) {
      setShowValidation(true);
      return;
    }
    if (dirty) transaction.submit(current);
  };
  const state = {
    current,
    canWrite,
    dirty,
    locked: transaction.isLocked(),
    missingFields,
    proving: transaction.proving,
    recovery: transaction.recovery,
    saving: transaction.saving,
    showValidation
  };
  return { discard, retry, state, submit, updateDraft };
}

function useAcceptedObjectStoreBaseline(record: ObjectStoreResourceRecord | undefined) {
  const [accepted, setAccepted] = useState<{
    source: ObjectStoreResourceRecord | undefined;
    value: ObjectStoreResourceRecord;
  } | null>(null);
  const acceptedRecord = accepted && accepted.source === record ? accepted.value : undefined;
  return {
    accept: (value: ObjectStoreResourceRecord) => setAccepted({ source: record, value }),
    baseline: createObjectStoreDraft(acceptedRecord ?? record)
  };
}

function useRetireObjectStoreWriteAccess(
  canWrite: boolean,
  retire: () => void,
  setDraft: Dispatch<SetStateAction<ObjectStoreDraft | null>>,
  setShowValidation: Dispatch<SetStateAction<boolean>>
) {
  const previousCanWrite = useRef(canWrite);
  useLayoutEffect(() => {
    const lostWriteAccess = previousCanWrite.current && !canWrite;
    previousCanWrite.current = canWrite;
    if (!lostWriteAccess) return;
    retire();
    setDraft(null);
    setShowValidation(false);
  }, [canWrite, retire, setDraft, setShowValidation]);
}
