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
  const draftState = deriveObjectStoreDraftState(draft, canonical.baseline, canonical.configured);
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
    if (draftState.missingFields.length > 0) {
      setShowValidation(true);
      return;
    }
    if (draftState.canSubmit) transaction.submit(draftState.current);
  };
  const state = {
    ...draftState,
    configured: canonical.configured,
    canWrite,
    locked: transaction.isLocked(),
    proving: transaction.proving,
    recovery: transaction.recovery,
    saving: transaction.saving,
    showValidation
  };
  return { discard, retry, state, submit, updateDraft };
}

function deriveObjectStoreDraftState(draft: ObjectStoreDraft | null, baseline: ObjectStoreDraft, configured: boolean) {
  const current = draft ?? baseline;
  const dirty = draft !== null && isObjectStoreDirty(draft, baseline);
  return {
    // A missing record can submit the default DATABASE baseline without pretending it was edited.
    canSubmit: !configured || dirty,
    current,
    dirty,
    missingFields: validateObjectStoreDraft(current)
  };
}

function useAcceptedObjectStoreBaseline(record: ObjectStoreResourceRecord | undefined) {
  const [accepted, setAccepted] = useState<{
    source: ObjectStoreResourceRecord | undefined;
    value: ObjectStoreResourceRecord;
  } | null>(null);
  const acceptedRecord = accepted && accepted.source === record ? accepted.value : undefined;
  const canonicalRecord = acceptedRecord ?? record;
  return {
    accept: (value: ObjectStoreResourceRecord) => setAccepted({ source: record, value }),
    baseline: createObjectStoreDraft(canonicalRecord),
    configured: canonicalRecord !== undefined
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
