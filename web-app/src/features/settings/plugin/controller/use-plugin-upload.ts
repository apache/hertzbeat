/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useState, type Dispatch, type SetStateAction } from 'react';

import { PluginRequestError, uploadPlugin } from '../api/plugin-api';
import {
  buildEmptyPluginUpload,
  pluginIdsByName,
  pluginPageIsComplete,
  pluginUploadConverged,
  validatePluginUpload,
  type PluginFailureKind,
  type PluginPage,
  type PluginUploadDraft
} from '../model/plugin-model';
import { executePluginCommand, usePluginCommandLifecycle } from './use-plugin-command-lifecycle';

type UploadContext = {
  draft: PluginUploadDraft | null;
  readCanonical: (draft: PluginUploadDraft) => Promise<PluginPage | null>;
  onChanged: () => Promise<unknown>;
  setUpload: Dispatch<SetStateAction<PluginUploadDraft | null>>;
  setInvalid: Dispatch<SetStateAction<{ name: boolean; jarFile: boolean }>>;
  setFailure: Dispatch<SetStateAction<PluginFailureKind | null>>;
  setBusy: Dispatch<SetStateAction<boolean>>;
  lifecycle: ReturnType<typeof usePluginCommandLifecycle>;
};
type UploadResult = { kind: 'accepted' } | { kind: 'failed'; failure: PluginFailureKind } | { kind: 'stopped' };

export function usePluginUpload(
  canWrite: boolean,
  readCanonical: (draft: PluginUploadDraft) => Promise<PluginPage | null>,
  onChanged: () => Promise<unknown>
) {
  const [upload, setUpload] = useState<PluginUploadDraft | null>(null);
  const [uploadInvalid, setInvalid] = useState({ name: false, jarFile: false });
  const [failure, setFailure] = useState<PluginFailureKind | null>(null);
  const [busy, setBusy] = useState(false);
  const lifecycle = usePluginCommandLifecycle(canWrite, () => {
    setBusy(false);
    setUpload(null);
    setInvalid({ name: false, jarFile: false });
    setFailure(null);
  });
  const { activeRef, authorizedRef } = lifecycle;
  const open = () => {
    if (!authorizedRef.current || activeRef.current) return;
    setFailure(null);
    setInvalid({ name: false, jarFile: false });
    setUpload(buildEmptyPluginUpload());
  };
  const cancel = () => {
    if (activeRef.current) return;
    setUpload(null);
    setInvalid({ name: false, jarFile: false });
    setFailure(null);
  };
  const patch = (value: Partial<PluginUploadDraft>) => {
    if (!activeRef.current) setUpload(current => (current ? { ...current, ...value } : current));
  };
  const save = () =>
    savePluginUpload({
      draft: upload,
      readCanonical,
      onChanged,
      setUpload,
      setInvalid,
      setFailure,
      setBusy,
      lifecycle
    });
  return {
    upload,
    uploadInvalid,
    failure,
    busy,
    actions: {
      openUpload: open,
      cancelUpload: cancel,
      saveUpload: save,
      setUploadName: (name: string) => patch({ name }),
      setUploadFile: (jarFile: File | null) => patch({ jarFile }),
      setUploadEnabled: (enableStatus: boolean) => patch({ enableStatus })
    }
  };
}

async function savePluginUpload(context: UploadContext) {
  const { activeRef, authorizedRef, generationRef, current } = context.lifecycle;
  if (!authorizedRef.current || !context.draft || activeRef.current) return;
  const valid = validatePluginUpload(context.draft);
  context.setInvalid({ name: !valid.name, jarFile: !valid.jarFile });
  if (!valid.name || !valid.jarFile) return;
  const draft = context.draft;
  const runGeneration = generationRef.current;
  activeRef.current = true;
  context.setBusy(true);
  context.setFailure(null);
  try {
    const result = await runVerifiedUpload(context, draft, runGeneration);
    if (result.kind === 'accepted') acceptUpload(context);
    if (result.kind === 'failed') context.setFailure(result.failure);
  } catch (error) {
    if (current(runGeneration)) context.setFailure(error instanceof PluginRequestError ? error.kind : 'error');
  } finally {
    if (current(runGeneration)) {
      activeRef.current = false;
      context.setBusy(false);
    }
  }
}

async function runVerifiedUpload(
  context: UploadContext,
  draft: PluginUploadDraft,
  runGeneration: number
): Promise<UploadResult> {
  const before = await context.readCanonical(draft);
  if (!context.lifecycle.current(runGeneration)) return { kind: 'stopped' };
  if (!before) return { kind: 'failed', failure: 'unavailable' };
  const previousIds = pluginIdsByName(before, draft.name);
  if (previousIds.size > 0) return { kind: 'failed', failure: 'conflict' };
  const outcome = await executePluginCommand(
    () => uploadPlugin(draft),
    () => context.lifecycle.current(runGeneration),
    context.setFailure
  );
  if (outcome.kind === 'stopped') return { kind: 'stopped' };
  if (outcome.kind === 'confirmed') return { kind: 'accepted' };
  if (!pluginPageIsComplete(before)) return { kind: 'failed', failure: outcome.failure };
  const page = await context.readCanonical(draft);
  if (!context.lifecycle.current(runGeneration)) return { kind: 'stopped' };
  return uploadWasVerified(page, draft, previousIds)
    ? { kind: 'accepted' }
    : { kind: 'failed', failure: outcome.failure };
}

function acceptUpload(context: UploadContext) {
  context.setUpload(null);
  void context.onChanged().catch(() => undefined);
}

function uploadWasVerified(page: PluginPage | null, draft: PluginUploadDraft, previousIds: ReadonlySet<number>) {
  return page ? pluginUploadConverged(page, draft, previousIds) : false;
}
