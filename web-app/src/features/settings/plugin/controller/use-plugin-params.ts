/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useState, type Dispatch, type SetStateAction } from 'react';

import { loadPluginParams, PluginRequestError, savePluginParams } from '../api/plugin-api';
import {
  buildPluginParamDraft,
  buildPluginParamPayload,
  canProvePluginParamWrite,
  invalidPluginParamFields,
  pluginParamWriteConverged,
  PluginParamCodecError,
  type PasswordDraft,
  type PluginParamDraft
} from '../model/plugin-params-model';
import type { PluginFailureKind, PluginRecord } from '../model/plugin-model';
import { usePluginCommandLifecycle } from './use-plugin-command-lifecycle';

type ParamEditor = { plugin: PluginRecord; draft: PluginParamDraft | null };
type ParamSaveContext = {
  draft: PluginParamDraft | null;
  lifecycle: ReturnType<typeof usePluginCommandLifecycle>;
  close: () => void;
  onChanged: () => Promise<unknown>;
  setEditor: Dispatch<SetStateAction<ParamEditor | null>>;
  setFailure: Dispatch<SetStateAction<PluginFailureKind | null>>;
  setInvalid: Dispatch<SetStateAction<string[]>>;
  setSaving: Dispatch<SetStateAction<boolean>>;
};

export function usePluginParams(canWrite: boolean, onChanged: () => Promise<unknown>) {
  const [editor, setEditor] = useState<ParamEditor | null>(null);
  const [failure, setFailure] = useState<PluginFailureKind | null>(null);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const lifecycle = usePluginCommandLifecycle(canWrite, () => {
    setEditor(null);
    setFailure(null);
    setInvalid([]);
    setSaving(false);
  });
  const { activeRef, authorizedRef, generationRef, current } = lifecycle;
  const open = async (plugin: PluginRecord) => {
    if (!authorizedRef.current || activeRef.current || plugin.paramCount === undefined || plugin.paramCount <= 0)
      return;
    const requestGeneration = ++generationRef.current;
    setFailure(null);
    setInvalid([]);
    setEditor({ plugin, draft: null });
    try {
      const data = await loadPluginParams(plugin.id);
      if (current(requestGeneration))
        setEditor({ plugin, draft: buildPluginParamDraft(plugin.id, data.paramDefines, data.pluginParams) });
    } catch (error) {
      if (current(requestGeneration)) setFailure(readFailure(error));
    }
  };
  const close = () => {
    generationRef.current += 1;
    activeRef.current = false;
    setEditor(null);
    setFailure(null);
    setInvalid([]);
    setSaving(false);
  };
  const cancel = () => !activeRef.current && close();
  const save = () =>
    savePluginParamDraft({
      draft: editor?.draft ?? null,
      lifecycle,
      close,
      onChanged,
      setEditor,
      setFailure,
      setInvalid,
      setSaving
    });
  const updateValue = (field: string, value: unknown) => {
    if (activeRef.current) return;
    updateDraft(setEditor, draft => ({ ...draft, values: { ...draft.values, [field]: value } }));
    setInvalid(currentInvalid => currentInvalid.filter(item => item !== field));
  };
  const updatePassword = (field: string, value: PasswordDraft) => {
    if (activeRef.current || (value.intent === 'KEEP' && !value.canKeep)) return;
    updateDraft(setEditor, draft => ({ ...draft, passwords: { ...draft.passwords, [field]: value } }));
    setInvalid(currentInvalid => currentInvalid.filter(item => item !== field));
  };
  return { editor, failure, invalid, busy: saving, actions: { open, cancel, save, updateValue, updatePassword } };
}

async function savePluginParamDraft(context: ParamSaveContext) {
  const { activeRef, authorizedRef, generationRef, current } = context.lifecycle;
  if (!authorizedRef.current || !context.draft || activeRef.current) return;
  const fields = invalidPluginParamFields(context.draft);
  context.setInvalid(fields);
  if (fields.length > 0) return;
  const draft = context.draft;
  activeRef.current = true;
  context.setSaving(true);
  context.setFailure(null);
  const saveGeneration = ++generationRef.current;
  try {
    await savePluginParams(buildPluginParamPayload(draft));
    if (current(saveGeneration)) acceptParamSave(context.close, context.onChanged);
  } catch (error) {
    if (await paramWriteWasProved(draft, error, saveGeneration, context)) {
      acceptParamSave(context.close, context.onChanged);
      return;
    }
    if (current(saveGeneration)) {
      context.setEditor(clearReplacementPasswords);
      context.setFailure(readFailure(error));
    }
  } finally {
    if (current(saveGeneration)) {
      activeRef.current = false;
      context.setSaving(false);
    }
  }
}

async function paramWriteWasProved(
  draft: PluginParamDraft,
  error: unknown,
  saveGeneration: number,
  context: ParamSaveContext
) {
  if (
    !context.lifecycle.current(saveGeneration) ||
    !(error instanceof PluginRequestError) ||
    error.writeOutcome !== 'uncertain' ||
    !canProvePluginParamWrite(draft)
  )
    return false;
  try {
    const data = await loadPluginParams(draft.pluginMetadataId);
    return context.lifecycle.current(saveGeneration) && pluginParamWriteConverged(draft, data.pluginParams);
  } catch {
    // A failed proof read must not replay the write or expose backend details.
    return false;
  }
}

function clearReplacementPasswords(current: ParamEditor | null) {
  if (!current?.draft) return current;
  const passwords = Object.fromEntries(
    Object.entries(current.draft.passwords).map(([field, password]) => [
      field,
      password.intent === 'REPLACE' ? { ...password, value: '' } : password
    ])
  );
  return { ...current, draft: { ...current.draft, passwords } };
}

function updateDraft(
  setter: React.Dispatch<React.SetStateAction<ParamEditor | null>>,
  update: (draft: PluginParamDraft) => PluginParamDraft
) {
  setter(current => (current?.draft ? { ...current, draft: update(current.draft) } : current));
}

function readFailure(error: unknown): PluginFailureKind {
  if (error instanceof PluginParamCodecError) return 'invalid';
  return error instanceof PluginRequestError ? error.kind : 'error';
}

function acceptParamSave(close: () => void, onChanged: () => Promise<unknown>) {
  close();
  void onChanged().catch(() => undefined);
}
