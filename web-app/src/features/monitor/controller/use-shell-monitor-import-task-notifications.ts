/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import type { TFunction } from 'i18next';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { loadMonitorImportTasks } from '../api/monitor-import-api';
import { openMonitorImportTaskStream } from '../api/monitor-import-task-stream';
import type { MonitorImportTask } from '../model/monitor-import-model';
import { monitorQueryKeys } from './monitor-query-keys';

type Notification = ReturnType<typeof App.useApp>['notification'];
type Delivery = { notification: Notification; t: TFunction };

export function useShellMonitorImportTaskNotifications() {
  const queryClient = useQueryClient();
  const { notification } = App.useApp();
  const { t } = useTranslation();
  const delivery = useRef<Delivery>({ notification, t });
  useEffect(() => {
    delivery.current = { notification, t };
  }, [notification, t]);

  useEffect(() => {
    const observed = new Map<string, string>();
    let mounted = true;
    let active: AbortController | null = null;
    let pending = false;
    let baselineEstablished = false;
    const reread = async () => {
      if (active) {
        pending = true;
        return;
      }
      do {
        pending = false;
        active = new AbortController();
        try {
          const tasks = await loadMonitorImportTasks(active.signal);
          if (!mounted) return;
          const completedTransition = publishChangedTasks(delivery.current, observed, tasks, !baselineEstablished);
          baselineEstablished = true;
          if (completedTransition) {
            await queryClient.refetchQueries(
              { queryKey: monitorQueryKeys.lists(), type: 'active' },
              { cancelRefetch: false }
            );
          }
          await queryClient.refetchQueries(
            { queryKey: monitorQueryKeys.importTasks(), type: 'active' },
            { cancelRefetch: false }
          );
        } catch {
          // Canonical task reads fail closed without projecting transport details.
        } finally {
          active = null;
        }
      } while (mounted && pending);
    };
    let stream: ReturnType<typeof openMonitorImportTaskStream> | undefined;
    try {
      stream = openMonitorImportTaskStream({ onCanonicalReread: () => void reread() });
    } catch {
      // Import submission and explicit task reads remain available without SSE.
    }
    return () => {
      mounted = false;
      pending = false;
      active?.abort();
      stream?.close();
    };
  }, [queryClient]);
}

function publishChangedTasks(
  delivery: Delivery,
  observed: Map<string, string>,
  tasks: MonitorImportTask[],
  baseline: boolean
) {
  let completedTransition = false;
  for (const task of tasks) {
    const fingerprint = `${task.status}:${task.progress}:${task.errorCode ?? ''}`;
    const previous = observed.get(task.taskId);
    if (previous === fingerprint) continue;
    observed.set(task.taskId, fingerprint);
    if (baseline && task.status !== 'IN_PROGRESS') continue;
    publishTask(delivery, task);
    if (previous?.startsWith('IN_PROGRESS:') && task.status === 'COMPLETED') completedTransition = true;
  }
  return completedTransition;
}

function publishTask(delivery: Delivery, task: MonitorImportTask) {
  delivery.notification.open({
    key: `monitor-import:${task.taskId}`,
    type: importTaskNotificationType(task),
    message: delivery.t('shell.importTasks.title'),
    description: importTaskDescription(delivery.t, task),
    duration: task.status === 'IN_PROGRESS' ? 0 : 4.5
  });
}

function importTaskNotificationType(task: MonitorImportTask) {
  if (task.status === 'IN_PROGRESS') return 'info' as const;
  if (task.status === 'COMPLETED') return 'success' as const;
  return 'error' as const;
}

function importTaskDescription(t: TFunction, task: MonitorImportTask) {
  if (task.status === 'IN_PROGRESS') return t('shell.importTasks.progress', { progress: task.progress });
  if (task.status === 'COMPLETED') return t('shell.importTasks.success');
  return t(`monitor.import.task.failure.${task.errorCode ?? 'IMPORT_FAILED'}`);
}
