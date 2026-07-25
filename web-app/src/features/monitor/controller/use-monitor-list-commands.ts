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

import { deleteMonitorGrafanaDashboards, mutateMonitors } from '../api/monitor-api';
import { type MonitorAction, type MonitorPage } from '../model/monitor-contract';
import type { MonitorWriteVerification } from '../model/monitor-write-verification';
import { verifyMonitorMutation, type MonitorDetailCacheEvidence } from './monitor-command-verification';
import { monitorQueryKeys } from './monitor-query-keys';
import { useMonitorInstanceCopy } from './use-monitor-instance-copy';
import type { MonitorSelectionController } from './use-monitor-selection';

type ActiveListOperation = { source: string; token: number; controller: AbortController };
export function useMonitorListCommands(
  source: string,
  reread: () => Promise<MonitorPage>,
  selection: Pick<MonitorSelectionController, 'remove' | 'validatedIds'>
) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const activeOperationRef = useRef<ActiveListOperation | null>(null);
  const sequence = useRef(0);
  const currentSourceRef = useRef<string | undefined>(undefined);
  const [busyOperation, setBusyOperation] = useState<ActiveListOperation | undefined>(undefined);
  const copyInstance = useMonitorInstanceCopy();
  useListOperationScope(source, currentSourceRef, activeOperationRef, setBusyOperation);

  const refresh = async () => {
    try {
      await reread();
      return true;
    } catch {
      return false;
    }
  };

  const run = async (action: MonitorAction, ids: number[]) => {
    if (activeOperationRef.current || ids.length === 0) return;
    const operation = { source, token: ++sequence.current, controller: new AbortController() };
    activeOperationRef.current = operation;
    setBusyOperation(operation);
    try {
      await mutateMonitors(action, ids);
      if (!ownsListOperation(activeOperationRef.current, currentSourceRef.current, operation)) return;
      const verification = await verifyMonitorMutation(action, ids, operation.controller.signal);
      if (!ownsListOperation(activeOperationRef.current, currentSourceRef.current, operation)) return;
      publishMonitorDetailEvidence(queryClient, verification);
      const grafanaCleanupFailed =
        action === 'delete' ? await deleteMonitorGrafanaDashboards(ids, operation.controller.signal) : false;
      if (!ownsListOperation(activeOperationRef.current, currentSourceRef.current, operation)) return;
      selection.remove(ids);
      notifyCommittedMutation(verification, message, t);
      if (grafanaCleanupFailed) void message.warning(t('monitor.grafana.cleanupFailure'));
      // The mutation is already committed at this point. A failed list refresh
      // must surface as read evidence, not rewrite a successful command as failed.
      try {
        await reread();
      } catch {
        return;
      }
    } catch {
      if (ownsListOperation(activeOperationRef.current, currentSourceRef.current, operation)) {
        void message.error(t('monitorActions.failed'));
      }
    } finally {
      releaseListOperation(source, operation, currentSourceRef, activeOperationRef, setBusyOperation);
    }
  };

  return {
    operating: busyOperation?.source === source,
    refresh,
    copyInstance,
    run,
    runBulk: (action: MonitorAction) => run(action, selection.validatedIds())
  };
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
      if (activeOperationRef.current?.source === source) {
        activeOperationRef.current.controller.abort();
        activeOperationRef.current = null;
      }
    };
  }, [activeOperationRef, currentSourceRef, setBusyOperation, source]);
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

function notifyCommittedMutation(
  verification: MonitorWriteVerification<unknown>,
  message: ReturnType<typeof App.useApp>['message'],
  t: ReturnType<typeof useTranslation>['t']
) {
  void message.success(t('monitorActions.success'));
  if (verification.kind === 'unavailable') void message.warning(t('common.unavailable'));
  if (verification.kind === 'error') void message.error(t('common.routeError.description'));
}

function publishMonitorDetailEvidence(
  queryClient: ReturnType<typeof useQueryClient>,
  verification: MonitorWriteVerification<MonitorDetailCacheEvidence[]>
) {
  if (!('evidence' in verification) || !verification.evidence) return;
  verification.evidence.forEach(evidence => {
    if (evidence.kind === 'detail') {
      queryClient.setQueryData(monitorQueryKeys.detail(evidence.detail.monitor.id), evidence.detail);
    } else {
      queryClient.removeQueries({ queryKey: monitorQueryKeys.detail(evidence.id), exact: true });
    }
  });
}
