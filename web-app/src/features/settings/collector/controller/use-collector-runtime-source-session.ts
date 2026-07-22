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
import type { CollectorMutationFailure, CollectorRecord } from '../model/collector-model';
import { sameCollectorQuery, type CollectorQuery } from '../model/collector-query-model';
import { persistCollectorRuntimeConfig } from './collector-runtime-config-persistence';

type RuntimeSession = {
  record: CollectorRecord;
  query: CollectorQuery;
  current: ManagedOtelRuntimeConfig | null;
};
type SourceEditor<Draft> = {
  record: CollectorRecord;
  query: CollectorQuery;
  current: ManagedOtelRuntimeConfig;
  draft: Draft;
};
export type RuntimeSourceAdapter<Draft> = {
  read: (current: ManagedOtelRuntimeConfig) => Draft;
  buildUpdate: (current: ManagedOtelRuntimeConfig, draft: Draft) => ManagedOtelRuntimeConfig | null;
  successKey: string;
};
type RuntimeSourceOwner = 'prometheus' | 'fileLog';
export type RuntimeSourceCoordinator = {
  claim: (owner: RuntimeSourceOwner) => boolean;
  release: (owner: RuntimeSourceOwner) => void;
};
type Options<Draft> = {
  queryRef: { current: CollectorQuery };
  session: RuntimeSession | null;
  closeRuntime: () => void;
  adapter: RuntimeSourceAdapter<Draft>;
  owner: RuntimeSourceOwner;
  coordinator: RuntimeSourceCoordinator;
};

export function createRuntimeSourceCoordinator(): RuntimeSourceCoordinator {
  let current: RuntimeSourceOwner | null = null;
  return {
    claim: owner => {
      if (current) return false;
      current = owner;
      return true;
    },
    release: owner => {
      if (current === owner) current = null;
    }
  };
}

export function useCollectorRuntimeSourceSession<Draft>(options: Options<Draft>) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const operationRef = useRef(0);
  const [editor, setEditor] = useState<SourceEditor<Draft> | null>(null);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<CollectorMutationFailure | null>(null);
  const open = () => {
    if (!options.coordinator.claim(options.owner)) return;
    if (!openSourceSession(options, saving, editor, setEditor, setFailure)) {
      options.coordinator.release(options.owner);
    }
  };
  const save = () =>
    saveSourceSession(options, editor, operationRef, setEditor, setSaving, setFailure, () => {
      void message.success(t(options.adapter.successKey));
    });
  const cancel = () => {
    if (cancelSourceSession(saving, operationRef, setEditor, setFailure)) {
      options.coordinator.release(options.owner);
    }
  };
  const close = () => {
    if (closeSourceSession(saving, operationRef, setEditor, setFailure, options.closeRuntime)) {
      options.coordinator.release(options.owner);
    }
  };
  const replaceDraft = (draft: Draft) => {
    setEditor(current => (current ? { ...current, draft } : current));
    setFailure(null);
  };
  return { editor, saving, failure, open, save, cancel, close, replaceDraft, reject: () => setFailure('validation') };
}

function openSourceSession<Draft>(
  options: Options<Draft>,
  saving: boolean,
  editor: SourceEditor<Draft> | null,
  setEditor: (editor: SourceEditor<Draft> | null) => void,
  setFailure: (failure: CollectorMutationFailure | null) => void
): boolean {
  const current = options.session?.current;
  if (!options.session || !current || saving || editor) return false;
  setEditor({
    record: options.session.record,
    query: options.session.query,
    current,
    draft: options.adapter.read(current)
  });
  setFailure(null);
  return true;
}

async function saveSourceSession<Draft>(
  options: Options<Draft>,
  editor: SourceEditor<Draft> | null,
  operationRef: { current: number },
  setEditor: (editor: SourceEditor<Draft> | null) => void,
  setSaving: (saving: boolean) => void,
  setFailure: (failure: CollectorMutationFailure | null) => void,
  notifySuccess: () => void
) {
  if (!editor) return;
  // Source ownership is fixed when Runtime opens; Save must never rebind after navigation.
  if (!sameCollectorQuery(editor.query, options.queryRef.current)) {
    closeStaleSource(setEditor, setFailure, options.closeRuntime);
    options.coordinator.release(options.owner);
    return;
  }
  const request = options.adapter.buildUpdate(editor.current, editor.draft);
  if (!request) return setFailure('validation');
  const operation = ++operationRef.current;
  setSaving(true);
  setFailure(null);
  // Persistence proves request = PUT response = authoritative GET before returning success.
  const result = await persistCollectorRuntimeConfig(editor.record.name, request);
  if (operation !== operationRef.current) return;
  if (!sameCollectorQuery(editor.query, options.queryRef.current)) {
    setSaving(false);
    closeStaleSource(setEditor, setFailure, options.closeRuntime);
    options.coordinator.release(options.owner);
    return;
  }
  setSaving(false);
  if (result) return setFailure(result);
  setEditor(null);
  options.coordinator.release(options.owner);
  options.closeRuntime();
  notifySuccess();
}

function closeStaleSource<Draft>(
  setEditor: (editor: SourceEditor<Draft> | null) => void,
  setFailure: (failure: CollectorMutationFailure | null) => void,
  closeRuntime: () => void
) {
  setEditor(null);
  setFailure(null);
  closeRuntime();
}

function cancelSourceSession<Draft>(
  saving: boolean,
  operationRef: { current: number },
  setEditor: (editor: SourceEditor<Draft> | null) => void,
  setFailure: (failure: CollectorMutationFailure | null) => void
): boolean {
  if (saving) return false;
  operationRef.current += 1;
  setEditor(null);
  setFailure(null);
  return true;
}

function closeSourceSession<Draft>(
  saving: boolean,
  operationRef: { current: number },
  setEditor: (editor: SourceEditor<Draft> | null) => void,
  setFailure: (failure: CollectorMutationFailure | null) => void,
  closeRuntime: () => void
): boolean {
  if (saving) return false;
  cancelSourceSession(false, operationRef, setEditor, setFailure);
  closeRuntime();
  return true;
}
