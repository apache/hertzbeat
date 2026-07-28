/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect, useState } from 'react';

import { deletePlugins, updatePluginStatus } from '../api/plugin-api';
import {
  pluginQueryAfterDelete,
  pluginDeleteConverged,
  pluginStatusConverged,
  type PluginDeleteTarget,
  type PluginFailureKind,
  type PluginPage,
  type PluginQuery,
  type PluginRecord
} from '../model/plugin-model';
import { executePluginCommand, usePluginCommandLifecycle } from './use-plugin-command-lifecycle';

type MutationOptions = {
  canWrite: boolean;
  query: PluginQuery;
  getQuery: () => PluginQuery;
  visibleRecords: number;
  selectedIds: number[];
  setSelected: (ids: number[]) => void;
  navigate: (query: PluginQuery, replace?: boolean) => void;
  reread: () => Promise<PluginPage | null>;
};

export function usePluginMutations(options: MutationOptions) {
  const [deleteTarget, setDeleteTarget] = useState<PluginDeleteTarget | null>(null);
  const { canWrite, setSelected } = options;
  const write = usePluginWriteState(options.canWrite);
  const deleteRequests = createDeleteRequests(options, write, setDeleteTarget);
  const toggleStatus = async (plugin: PluginRecord) => {
    const nextStatus = !plugin.enableStatus;
    await write.run(
      () => updatePluginStatus(plugin.id, nextStatus),
      async () => {
        const page = await options.reread();
        return Boolean(page && pluginStatusConverged(page, plugin.id, nextStatus));
      },
      'updated'
    );
  };
  const confirmDelete = () => runPluginDelete(deleteTarget, options, write, setDeleteTarget);
  useEffect(() => {
    if (canWrite) return;
    queueMicrotask(() => {
      setDeleteTarget(null);
      setSelected([]);
    });
  }, [canWrite, setSelected]);
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

async function runPluginDelete(
  target: PluginDeleteTarget | null,
  options: MutationOptions,
  write: ReturnType<typeof usePluginWriteState>,
  setDeleteTarget: (target: PluginDeleteTarget | null) => void
) {
  if (!target) return;
  const receiptQuery = options.query;
  const changed = await write.run(
    () => deletePlugins(target.ids),
    async () => {
      const page = await options.reread();
      return Boolean(page && pluginDeleteConverged(page, target.ids));
    },
    'deleted'
  );
  if (!changed) return;
  const next = pluginQueryAfterDelete(options.getQuery(), {
    query: receiptQuery,
    visibleRecords: options.visibleRecords,
    deleteCount: target.ids.length
  });
  setDeleteTarget(null);
  options.setSelected([]);
  if (next) options.navigate(next, true);
}

function createDeleteRequests(
  options: { canWrite: boolean; selectedIds: number[] },
  write: ReturnType<typeof usePluginWriteState>,
  setTarget: (target: PluginDeleteTarget | null) => void
) {
  const ready = () => write.authorizedRef.current && !write.activeRef.current;
  return {
    cancelDelete: () => {
      if (!write.activeRef.current) {
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
  const lifecycle = usePluginCommandLifecycle(canWrite, () => {
    setBusy(false);
    setFailure(null);
    setNotice(null);
  });
  const { activeRef, authorizedRef, generationRef, current } = lifecycle;
  const reset = () => {
    setFailure(null);
    setNotice(null);
  };
  const run = async (
    operation: () => Promise<unknown>,
    verify: () => Promise<boolean>,
    success: 'updated' | 'deleted'
  ) => {
    if (!authorizedRef.current || activeRef.current) return false;
    const runGeneration = generationRef.current;
    activeRef.current = true;
    setBusy(true);
    reset();
    try {
      const outcome = await executePluginCommand(operation, () => current(runGeneration), setFailure);
      if (outcome.kind === 'stopped') return false;
      const converged = await verify();
      if (!current(runGeneration)) return false;
      if (!converged) {
        setFailure(outcome.kind === 'uncertain' ? outcome.failure : 'error');
        return false;
      }
      setNotice(success);
      return true;
    } catch {
      if (current(runGeneration)) setFailure('error');
      return false;
    } finally {
      if (current(runGeneration)) {
        activeRef.current = false;
        setBusy(false);
      }
    }
  };
  return { activeRef, authorizedRef, busy, failure, notice, reset, run };
}
