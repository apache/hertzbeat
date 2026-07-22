/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useRef, useState } from 'react';

import { loadPluginParams, PluginRequestError, savePluginParams } from '../api/plugin-api';
import {
  buildPluginParamDraft,
  buildPluginParamPayload,
  invalidPluginParamFields,
  PluginParamCodecError,
  type PasswordDraft,
  type PluginParamDraft
} from '../model/plugin-params-model';
import type { PluginFailureKind, PluginRecord } from '../model/plugin-model';

type ParamEditor = { plugin: PluginRecord; draft: PluginParamDraft | null };

export function usePluginParams(canWrite: boolean, onChanged: () => Promise<unknown>) {
  const [editor, setEditor] = useState<ParamEditor | null>(null);
  const [failure, setFailure] = useState<PluginFailureKind | null>(null);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const requestId = useRef(0);
  const open = async (plugin: PluginRecord) => {
    if (!canWrite || saving || plugin.paramCount === undefined || plugin.paramCount <= 0) return;
    const current = ++requestId.current;
    setFailure(null);
    setInvalid([]);
    setEditor({ plugin, draft: null });
    try {
      const data = await loadPluginParams(plugin.id);
      if (current === requestId.current)
        setEditor({ plugin, draft: buildPluginParamDraft(plugin.id, data.paramDefines, data.pluginParams) });
    } catch (error) {
      if (current === requestId.current) setFailure(readFailure(error));
    }
  };
  const close = () => {
    requestId.current += 1;
    setEditor(null);
    setFailure(null);
    setInvalid([]);
  };
  const cancel = () => !saving && close();
  const save = async () => {
    if (!canWrite || !editor?.draft || saving) return;
    const fields = invalidPluginParamFields(editor.draft);
    setInvalid(fields);
    if (fields.length > 0) return;
    setSaving(true);
    setFailure(null);
    try {
      await savePluginParams(buildPluginParamPayload(editor.draft));
      close();
      void onChanged().catch(() => undefined);
    } catch (error) {
      setEditor(clearReplacementPasswords);
      setFailure(readFailure(error));
    } finally {
      setSaving(false);
    }
  };
  const updateValue = (field: string, value: unknown) => {
    if (!saving) {
      updateDraft(setEditor, draft => ({ ...draft, values: { ...draft.values, [field]: value } }));
      setInvalid(current => current.filter(item => item !== field));
    }
  };
  const updatePassword = (field: string, value: PasswordDraft) => {
    if (!saving && (value.intent !== 'KEEP' || value.canKeep)) {
      updateDraft(setEditor, draft => ({ ...draft, passwords: { ...draft.passwords, [field]: value } }));
      setInvalid(current => current.filter(item => item !== field));
    }
  };
  return { editor, failure, invalid, busy: saving, actions: { open, cancel, save, updateValue, updatePassword } };
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
  if (error instanceof PluginParamCodecError) return 'contract';
  return error instanceof PluginRequestError ? error.kind : 'error';
}
