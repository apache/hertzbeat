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

import type { QueryClient } from '@tanstack/react-query';
import type { MessageInstance } from 'antd/es/message/interface';
import type { TFunction } from 'i18next';

import { deleteMonitorGrafanaDashboards, mutateMonitors } from '../api/monitor-api';
import type { MonitorAction, MonitorPage } from '../model/monitor-contract';
import type { MonitorWriteVerification } from '../model/monitor-write-verification';
import { verifyMonitorMutation, type MonitorDetailCacheEvidence } from './monitor-command-verification';
import { reconcileFailedMonitorCopy } from './monitor-copy-failure-reconciliation';
import { monitorQueryKeys } from './monitor-query-keys';

export type ActiveListOperation = {
  action: MonitorAction;
  source: string;
  token: number;
  controller: AbortController;
};

type ListOperationPublications = {
  queryClient: QueryClient;
  removeSelection: (ids: readonly number[]) => void;
  reread: () => Promise<MonitorPage>;
  message: MessageInstance;
  t: TFunction;
};

export async function executeMonitorListOperation(
  operation: ActiveListOperation,
  ids: number[],
  owns: () => boolean,
  publications: ListOperationPublications
) {
  const { queryClient, removeSelection, reread, message, t } = publications;
  try {
    await mutateMonitors(operation.action, ids, operation.controller.signal);
    if (!owns()) return;
    const verification = await verifyMonitorMutation(operation.action, ids, operation.controller.signal);
    if (!owns()) return;
    const cleanupFailed =
      operation.action === 'delete' ? await deleteMonitorGrafanaDashboards(ids, operation.controller.signal) : false;
    if (!owns()) return;
    publishMonitorDetailEvidence(queryClient, verification);
    removeSelection(ids);
    notifyCommittedMutation(verification, message, t);
    if (cleanupFailed) void message.warning(t('monitor.grafana.cleanupFailure'));
    // A committed mutation remains successful even when its list refresh fails.
    await refreshMonitorList(reread);
  } catch (error) {
    if (!owns()) return;
    void message.error(t('monitorActions.failed'));
    await reconcileFailedMonitorCopy(operation.action, error, reread);
  }
}

export async function refreshMonitorList(reread: () => Promise<MonitorPage>) {
  try {
    await reread();
    return true;
  } catch {
    return false;
  }
}

function notifyCommittedMutation(
  verification: MonitorWriteVerification<unknown>,
  message: MessageInstance,
  t: TFunction
) {
  void message.success(t('monitorActions.success'));
  if (verification.kind === 'unavailable') void message.warning(t('common.unavailable'));
  if (verification.kind === 'error') void message.error(t('common.routeError.description'));
}

function publishMonitorDetailEvidence(
  queryClient: QueryClient,
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
