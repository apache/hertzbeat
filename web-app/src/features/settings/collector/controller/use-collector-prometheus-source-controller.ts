/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { App } from 'antd';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ManagedOtelRuntimeConfig } from '../api/collector-runtime-config-schema';
import {
  buildManagedOtelPrometheusTargetsUpdate,
  managedOtelPrometheusTargetDraft
} from '../api/collector-prometheus-source-schema';
import type { CollectorMutationFailure, CollectorRecord } from '../model/collector-model';
import { sameCollectorQuery, type CollectorQuery } from '../model/collector-query-model';
import {
  applyPrometheusTarget,
  cancelPrometheusTarget,
  removePrometheusTarget,
  selectPrometheusTarget,
  type ManagedPrometheusSourceView,
  type ManagedPrometheusTargetDraft,
  type ManagedPrometheusTargetSelection
} from '../model/collector-prometheus-source-model';
import { persistCollectorRuntimeConfig } from './collector-runtime-config-persistence';

type SourceSession = { record: CollectorRecord; query: CollectorQuery; current: ManagedOtelRuntimeConfig };
type Editor = SourceSession & ManagedPrometheusSourceView;
type Options = {
  queryRef: { current: CollectorQuery };
  session: { record: CollectorRecord; query: CollectorQuery; current: ManagedOtelRuntimeConfig | null } | null;
  closeRuntime: () => void;
};

export function useCollectorPrometheusSourceController(options: Options) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const operationRef = useRef(0);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<CollectorMutationFailure | null>(null);
  const open = () => openPrometheusSources(options.session, saving, editor, setEditor, setFailure);
  const select = (selection: ManagedPrometheusTargetSelection) =>
    selectTarget(selection, editor, setEditor, setFailure);
  const apply = (target: ManagedPrometheusTargetDraft) => applyTarget(target, editor, setEditor, setFailure);
  const remove = (index: number) => removeTarget(index, editor, setEditor, setFailure);
  const save = () =>
    savePrometheusSources(
      options,
      editor,
      operationRef,
      setEditor,
      setSaving,
      setFailure,
      () => void message.success(t('collectors.runtime.prometheus.success'))
    );
  const cancel = () => cancelSources(saving, operationRef, setEditor, setFailure);
  const close = () => closeSources(saving, operationRef, setEditor, setFailure, options.closeRuntime);
  const cancelTarget = () => {
    setEditor(current => (current ? { ...current, ...cancelPrometheusTarget(current) } : current));
    setFailure(null);
  };
  const view = editor ? { record: editor.record, targets: editor.targets, selection: editor.selection } : null;
  return { editor: view, saving, failure, open, select, apply, remove, save, cancel, close, cancelTarget };
}

function openPrometheusSources(
  session: Options['session'],
  saving: boolean,
  editor: Editor | null,
  setEditor: (editor: Editor | null) => void,
  setFailure: (failure: CollectorMutationFailure | null) => void
) {
  const current = session?.current;
  if (!session || !current || saving || editor) return;
  setEditor({
    record: session.record,
    query: session.query,
    current,
    targets: current.prometheusTargets.map(managedOtelPrometheusTargetDraft),
    selection: null
  });
  setFailure(null);
}

function selectTarget(
  selection: ManagedPrometheusTargetSelection,
  editor: Editor | null,
  setEditor: (editor: Editor | null) => void,
  setFailure: (failure: CollectorMutationFailure | null) => void
) {
  if (!editor) return;
  const next = selectPrometheusTarget(editor, selection);
  if (!next) return;
  setEditor({ ...editor, ...next });
  setFailure(null);
}

function applyTarget(
  target: ManagedPrometheusTargetDraft,
  editor: Editor | null,
  setEditor: (editor: Editor | null) => void,
  setFailure: (failure: CollectorMutationFailure | null) => void
) {
  if (!editor) return;
  const next = applyPrometheusTarget(editor, target);
  if (!next) return;
  if (!buildManagedOtelPrometheusTargetsUpdate(editor.current, next.targets)) return setFailure('validation');
  setEditor({ ...editor, ...next });
  setFailure(null);
}

function removeTarget(
  index: number,
  editor: Editor | null,
  setEditor: (editor: Editor | null) => void,
  setFailure: (failure: CollectorMutationFailure | null) => void
) {
  if (!editor) return;
  const next = removePrometheusTarget(editor, index);
  if (!next) return;
  setEditor({ ...editor, ...next });
  setFailure(null);
}

async function savePrometheusSources(
  options: Options,
  editor: Editor | null,
  operationRef: { current: number },
  setEditor: (editor: Editor | null) => void,
  setSaving: (saving: boolean) => void,
  setFailure: (failure: CollectorMutationFailure | null) => void,
  notifySuccess: () => void
) {
  if (!editor) return;
  // Ownership stays bound to the Runtime-open query; Save must never rebind a stale session.
  if (!sameCollectorQuery(editor.query, options.queryRef.current)) {
    setEditor(null);
    setFailure(null);
    options.closeRuntime();
    return;
  }
  const request = buildManagedOtelPrometheusTargetsUpdate(editor.current, editor.targets);
  if (!request) return setFailure('validation');
  const operation = ++operationRef.current;
  setSaving(true);
  setFailure(null);
  const result = await persistCollectorRuntimeConfig(editor.record.name, request);
  if (operation !== operationRef.current) return;
  if (!sameCollectorQuery(editor.query, options.queryRef.current)) {
    setSaving(false);
    setEditor(null);
    setFailure(null);
    options.closeRuntime();
    return;
  }
  setSaving(false);
  if (result) return setFailure(result);
  setEditor(null);
  options.closeRuntime();
  notifySuccess();
}

function cancelSources(
  saving: boolean,
  operationRef: { current: number },
  setEditor: (editor: Editor | null) => void,
  setFailure: (failure: CollectorMutationFailure | null) => void
) {
  if (saving) return;
  operationRef.current += 1;
  setEditor(null);
  setFailure(null);
}

function closeSources(
  saving: boolean,
  operationRef: { current: number },
  setEditor: (editor: Editor | null) => void,
  setFailure: (failure: CollectorMutationFailure | null) => void,
  closeRuntime: () => void
) {
  if (saving) return;
  cancelSources(false, operationRef, setEditor, setFailure);
  closeRuntime();
}
