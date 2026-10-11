/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { MonitorCapabilities } from '../model/monitor-capability-model';
import { type MonitorAction, type MonitorPage } from '../model/monitor-contract';
import { executeMonitorListOperation, refreshMonitorList, type ActiveListOperation } from './monitor-list-operation';
import { useMonitorInstanceCopy } from './use-monitor-instance-copy';
import type { MonitorSelectionController } from './use-monitor-selection';

export function useMonitorListCommands(
  source: string,
  reread: () => Promise<MonitorPage>,
  selection: Pick<MonitorSelectionController, 'remove' | 'validatedIds'>,
  capabilities: Pick<MonitorCapabilities, 'canWrite' | 'canDelete'>
) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const activeOperationRef = useRef<ActiveListOperation | null>(null);
  const sequence = useRef(0);
  const currentSourceRef = useRef<string | undefined>(undefined);
  const currentCapabilitiesRef = useRef(capabilities);
  const [busyOperation, setBusyOperation] = useState<ActiveListOperation | undefined>(undefined);
  const copyInstance = useMonitorInstanceCopy();
  useListOperationScope(source, currentSourceRef, activeOperationRef, setBusyOperation);
  useListCapabilityScope(
    capabilities,
    currentCapabilitiesRef,
    activeOperationRef,
    setBusyOperation,
    selection.remove,
    selection.validatedIds
  );

  const run = async (action: MonitorAction, ids: number[]) => {
    if (!canStartListCommand(action, ids, currentCapabilitiesRef.current, activeOperationRef.current)) return;
    const operation = { action, source, token: ++sequence.current, controller: new AbortController() };
    activeOperationRef.current = operation;
    setBusyOperation(operation);
    const owns = () => ownsListOperation(activeOperationRef.current, currentSourceRef.current, operation);
    try {
      await executeMonitorListOperation(operation, ids, owns, {
        queryClient,
        removeSelection: selection.remove,
        reread,
        message,
        t
      });
    } finally {
      releaseListOperation(source, operation, currentSourceRef, activeOperationRef, setBusyOperation);
    }
  };

  return {
    operating: busyOperation?.source === source,
    refresh: () => refreshMonitorList(reread),
    copyInstance,
    run,
    runBulk: (action: MonitorAction) => run(action, selection.validatedIds())
  };
}

function canStartListCommand(
  action: MonitorAction,
  ids: number[],
  capabilities: Pick<MonitorCapabilities, 'canWrite' | 'canDelete'>,
  active: ActiveListOperation | null
) {
  if (active || ids.length === 0) return false;
  return canUseListAction(action, capabilities);
}

function canUseListAction(action: MonitorAction, capabilities: Pick<MonitorCapabilities, 'canWrite' | 'canDelete'>) {
  return action === 'delete' ? capabilities.canDelete : capabilities.canWrite;
}

function useListOperationScope(
  source: string,
  currentSourceRef: React.MutableRefObject<string | undefined>,
  activeOperationRef: React.MutableRefObject<ActiveListOperation | null>,
  setBusyOperation: React.Dispatch<React.SetStateAction<ActiveListOperation | undefined>>
) {
  useLayoutEffect(() => {
    currentSourceRef.current = source;
    setBusyOperation(undefined);
    return () => {
      if (currentSourceRef.current === source) currentSourceRef.current = undefined;
      const active = activeOperationRef.current;
      if (active?.source === source) {
        activeOperationRef.current = null;
        active.controller.abort();
      }
    };
  }, [activeOperationRef, currentSourceRef, setBusyOperation, source]);
}

function useListCapabilityScope(
  capabilities: Pick<MonitorCapabilities, 'canWrite' | 'canDelete'>,
  currentCapabilitiesRef: React.MutableRefObject<Pick<MonitorCapabilities, 'canWrite' | 'canDelete'>>,
  activeOperationRef: React.MutableRefObject<ActiveListOperation | null>,
  setBusyOperation: React.Dispatch<React.SetStateAction<ActiveListOperation | undefined>>,
  removeSelection: (ids: readonly number[]) => void,
  validatedIds: () => number[]
) {
  const { canDelete, canWrite } = capabilities;
  useLayoutEffect(() => {
    const nextCapabilities = { canDelete, canWrite };
    const previous = currentCapabilitiesRef.current;
    currentCapabilitiesRef.current = nextCapabilities;
    const active = activeOperationRef.current;
    if (active && !canUseListAction(active.action, nextCapabilities)) {
      activeOperationRef.current = null;
      setBusyOperation(current => (current?.token === active.token ? undefined : current));
      active.controller.abort();
    }
    if (previous.canWrite && !canWrite) {
      const selectedIds = validatedIds();
      if (selectedIds.length > 0) removeSelection(selectedIds);
    }
  }, [
    activeOperationRef,
    canDelete,
    canWrite,
    currentCapabilitiesRef,
    removeSelection,
    setBusyOperation,
    validatedIds
  ]);
}

function ownsListOperation(
  active: ActiveListOperation | null,
  currentSource: string | undefined,
  expected: ActiveListOperation
) {
  return active?.token === expected.token && currentSource === expected.source;
}

function releaseListOperation(
  source: string,
  operation: ActiveListOperation,
  currentSourceRef: React.MutableRefObject<string | undefined>,
  activeOperationRef: React.MutableRefObject<ActiveListOperation | null>,
  setBusyOperation: React.Dispatch<React.SetStateAction<ActiveListOperation | undefined>>
) {
  if (activeOperationRef.current?.token === operation.token) activeOperationRef.current = null;
  if (currentSourceRef.current === source) {
    setBusyOperation(current => (current?.token === operation.token ? undefined : current));
  }
}
