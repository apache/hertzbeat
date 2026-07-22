/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useRef, useState } from 'react';

import { deletePlugins, PluginRequestError, updatePluginStatus } from '../api/plugin-api';
import {
  pluginQueryAfterDelete,
  type PluginDeleteTarget,
  type PluginFailureKind,
  type PluginQuery,
  type PluginRecord
} from '../model/plugin-model';

export function usePluginMutations(options: {
  canWrite: boolean;
  query: PluginQuery;
  getQuery: () => PluginQuery;
  visibleRecords: number;
  selectedIds: number[];
  setSelected: (ids: number[]) => void;
  navigate: (query: PluginQuery, replace?: boolean) => void;
  onChanged: () => Promise<void>;
}) {
  const [deleteTarget, setDeleteTarget] = useState<PluginDeleteTarget | null>(null);
  const write = usePluginWriteState(options.canWrite);
  const deleteRequests = createDeleteRequests(options, write, setDeleteTarget);
  const toggleStatus = async (plugin: PluginRecord) => {
    const changed = await write.run(() => updatePluginStatus(plugin.id, !plugin.enableStatus), 'updated');
    if (changed) await options.onChanged();
  };
  const confirmDelete = async () => {
    const target = deleteTarget;
    if (!target) return;
    const receiptQuery = options.query;
    const changed = await write.run(() => deletePlugins(target.ids), 'deleted');
    if (!changed) return;
    const next = pluginQueryAfterDelete(options.getQuery(), {
      query: receiptQuery,
      visibleRecords: options.visibleRecords,
      deleteCount: target.ids.length
    });
    setDeleteTarget(null);
    options.setSelected([]);
    if (next) options.navigate(next, true);
    await options.onChanged();
  };
  return {
    deleteTarget,
    failure: write.failure,
    notice: write.notice,
    busy: write.busy,
    actions: {
      ...deleteRequests,
      clearOutcome: write.reset,
      toggleStatus,
      confirmDelete
    }
  };
}

function createDeleteRequests(
  options: { canWrite: boolean; selectedIds: number[] },
  write: ReturnType<typeof usePluginWriteState>,
  setTarget: (target: PluginDeleteTarget | null) => void
) {
  const ready = () => options.canWrite && !write.active.current;
  return {
    cancelDelete: () => {
      if (!write.active.current) {
        setTarget(null);
        write.reset();
      }
    },
    requestDeleteOne: (plugin: PluginRecord) => {
      if (ready()) {
        write.reset();
        setTarget({ ids: [plugin.id], label: plugin.name, mode: 'single' });
      }
    },
    requestDeleteSelected: () => {
      if (ready() && options.selectedIds.length > 0) {
        write.reset();
        setTarget({ ids: [...options.selectedIds], label: String(options.selectedIds.length), mode: 'batch' });
      }
    }
  };
}

function usePluginWriteState(canWrite: boolean) {
  const [failure, setFailure] = useState<PluginFailureKind | null>(null);
  const [notice, setNotice] = useState<'updated' | 'deleted' | null>(null);
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  const reset = () => {
    setFailure(null);
    setNotice(null);
  };
  const run = async (operation: () => Promise<unknown>, success: 'updated' | 'deleted') => {
    if (!canWrite || active.current) return false;
    active.current = true;
    setBusy(true);
    reset();
    try {
      await operation();
      setNotice(success);
      return true;
    } catch (error) {
      setFailure(error instanceof PluginRequestError ? error.kind : 'error');
      return false;
    } finally {
      active.current = false;
      setBusy(false);
    }
  };
  return { active, busy, failure, notice, reset, run };
}
