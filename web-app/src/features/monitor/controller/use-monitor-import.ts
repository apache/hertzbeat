/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { loadMonitorImportTask, MonitorImportTaskReadError } from '../api/monitor-import-api';
import type { MonitorCapabilities } from '../model/monitor-capability-model';
import {
  validateMonitorImportFile,
  type MonitorImportDraft,
  type MonitorImportFailureKind,
  type MonitorImportInvalidKind,
  type MonitorImportState,
  type MonitorImportTask,
  type MonitorImportTaskEvidence
} from '../model/monitor-import-model';
import { executeMonitorImport, type MonitorImportExecutionOwner } from './monitor-import-execution';
import { monitorQueryKeys } from './monitor-query-keys';

export function useMonitorImport(
  reread: () => Promise<unknown>,
  capabilities: Pick<MonitorCapabilities, 'canWrite'>,
  onImported: () => void = () => undefined
) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<MonitorImportDraft | null>(null);
  const [invalid, setInvalid] = useState<MonitorImportInvalidKind | null>(null);
  const [failure, setFailure] = useState<MonitorImportFailureKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const lifecycle = useImportLifecycle(capabilities.canWrite, () => {
    setOpen(false);
    setDraft(null);
    setInvalid(null);
    setFailure(null);
    setBusy(false);
    setActiveTaskId(null);
  });
  const taskQuery = useQuery({
    queryKey: monitorQueryKeys.importTask(activeTaskId),
    queryFn: activeTaskId ? ({ signal }) => loadMonitorImportTask(activeTaskId, signal) : skipToken,
    retry: false,
    staleTime: Infinity
  });
  const task = resolveImportTaskEvidence(activeTaskId, taskQuery);
  useCompletedImportConvergence(task, reread, onImported, lifecycle.mounted);

  const openDialog = () => {
    if (!lifecycle.canStart()) return;
    setOpen(true);
    setDraft({ file: null });
    setInvalid(null);
    setFailure(null);
    setActiveTaskId(null);
  };
  const cancel = () => lifecycle.retire();
  const selectFile = (file: File | null) => {
    if (!lifecycle.canStart() || !open || activeTaskId) return;
    setDraft({ file });
    setInvalid(null);
    setFailure(null);
  };
  const submit = async () => {
    if (!lifecycle.canStart() || !open || !draft) return false;
    const validation = validateMonitorImportFile(draft.file);
    if (!validation.valid) {
      setInvalid(validation.reason);
      return false;
    }
    const owner = lifecycle.begin();
    if (!owner) return false;
    setBusy(true);
    setFailure(null);
    return executeMonitorImport(validation.file, {
      owner,
      owns: () => lifecycle.owns(owner),
      accept: accepted => {
        queryClient.setQueryData(monitorQueryKeys.importTask(accepted.taskId), accepted);
        setActiveTaskId(accepted.taskId);
        setDraft({ file: null });
      },
      publishFailure: setFailure,
      finish: () => {
        if (!lifecycle.finish(owner)) return;
        setBusy(false);
      }
    });
  };
  const state: MonitorImportState = {
    canImport: capabilities.canWrite,
    open,
    draft,
    invalid,
    failure,
    busy,
    task
  };
  return { state, actions: { open: openDialog, cancel, selectFile, submit } };
}

function resolveImportTaskEvidence(
  activeTaskId: string | null,
  query: ReturnType<typeof useQuery<MonitorImportTask>>
): MonitorImportTaskEvidence {
  if (!activeTaskId) return { kind: 'idle' };
  if (query.isPending) return { kind: 'loading' };
  if (query.isError) {
    return query.error instanceof MonitorImportTaskReadError ? { kind: query.error.kind } : { kind: 'error' };
  }
  return { kind: 'ready', task: query.data, refreshing: query.isFetching };
}

function useCompletedImportConvergence(
  evidence: MonitorImportTaskEvidence,
  reread: () => Promise<unknown>,
  onImported: () => void,
  mounted: React.RefObject<boolean>
) {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const converged = useRef(new Set<string>());
  useEffect(() => {
    if (evidence.kind !== 'ready' || evidence.task.status !== 'COMPLETED') return;
    const taskId = evidence.task.taskId;
    if (converged.current.has(taskId)) return;
    converged.current.add(taskId);
    onImported();
    void reread().catch(() => {
      if (mounted.current) void message.warning(t('monitor.import.refreshFailure'));
    });
  }, [evidence, message, mounted, onImported, reread, t]);
}

function useImportLifecycle(canImport: boolean, reset: () => void) {
  const active = useRef<MonitorImportExecutionOwner | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const currentCanImport = useRef(canImport);
  const resetRef = useRef(reset);
  resetRef.current = reset;
  const retire = useCallback(() => {
    const owner = active.current;
    active.current = null;
    generation.current += 1;
    if (mounted.current) resetRef.current();
    owner?.controller.abort();
  }, []);
  useLayoutEffect(() => {
    currentCanImport.current = canImport;
    if (!canImport) retire();
  }, [canImport, retire]);
  useLayoutEffect(
    () => () => {
      mounted.current = false;
      const owner = active.current;
      active.current = null;
      generation.current += 1;
      owner?.controller.abort();
    },
    []
  );
  const owns = (owner: MonitorImportExecutionOwner) =>
    mounted.current && currentCanImport.current && active.current === owner && generation.current === owner.generation;
  return {
    mounted,
    retire,
    canStart: () => mounted.current && currentCanImport.current && active.current === null,
    begin: () => {
      if (!mounted.current || !currentCanImport.current || active.current) return null;
      const owner = { generation: generation.current + 1, controller: new AbortController() };
      generation.current = owner.generation;
      active.current = owner;
      return owner;
    },
    owns,
    finish: (owner: MonitorImportExecutionOwner) => {
      if (!owns(owner)) return false;
      active.current = null;
      generation.current += 1;
      return true;
    }
  };
}
