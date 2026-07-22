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
      toggleStatus,
      confirmDelete,
      cancelDelete: () => {
        if (!write.active.current) setDeleteTarget(null);
      },
      requestDeleteOne: (plugin: PluginRecord) => {
        if (options.canWrite && !write.active.current)
          setDeleteTarget({ ids: [plugin.id], label: plugin.name, mode: 'single' });
      },
      requestDeleteSelected: () => {
        if (options.canWrite && options.selectedIds.length > 0 && !write.active.current) {
          setDeleteTarget({ ids: [...options.selectedIds], label: String(options.selectedIds.length), mode: 'batch' });
        }
      }
    }
  };
}

function usePluginWriteState(canWrite: boolean) {
  const [failure, setFailure] = useState<PluginFailureKind | null>(null);
  const [notice, setNotice] = useState<'updated' | 'deleted' | null>(null);
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  const run = async (operation: () => Promise<unknown>, success: 'updated' | 'deleted') => {
    if (!canWrite || active.current) return false;
    active.current = true;
    setBusy(true);
    setFailure(null);
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
  return { active, busy, failure, notice, run };
}
