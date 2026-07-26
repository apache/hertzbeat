/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { App } from 'antd';
import type { TFunction } from 'i18next';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { openMonitorImportTaskStream } from '../api/monitor-import-task-stream';
import type { MonitorImportTaskEvent } from '../api/monitor-import-task-schema';

type Notification = ReturnType<typeof App.useApp>['notification'];
const progressNotificationDuration = 0;
const terminalNotificationDuration = 4.5;
const notificationKeyPrefix = 'monitor-import:';

/**
 * Restores the manager-wide import progress channel without sharing or
 * overwriting the alert SSE connection owned by the shell.
 */
export function useShellMonitorImportTaskNotifications() {
  const { notification } = App.useApp();
  const { t } = useTranslation();
  const delivery = useRef({ notification, t });

  useEffect(() => {
    delivery.current = { notification, t };
  }, [notification, t]);

  useEffect(() => {
    try {
      const stream = openMonitorImportTaskStream({
        onTask: event => publishImportTaskNotification(delivery.current.notification, delivery.current.t, event)
      });
      return () => stream.close();
    } catch {
      // Import submission and canonical reread remain usable when the optional
      // progress channel is not supported by the current browser or server.
      return undefined;
    }
  }, []);
}

function publishImportTaskNotification(notification: Notification, t: TFunction, event: MonitorImportTaskEvent) {
  notification.open({
    key: `${notificationKeyPrefix}${event.taskName}`,
    type: notificationType(event),
    message: t('shell.importTasks.title'),
    description: notificationDescription(event, t),
    duration: event.kind === 'progress' ? progressNotificationDuration : terminalNotificationDuration
  });
}

function notificationType(event: MonitorImportTaskEvent) {
  if (event.kind === 'progress') return 'info' as const;
  if (event.kind === 'success') return 'success' as const;
  return 'error' as const;
}

function notificationDescription(event: MonitorImportTaskEvent, t: TFunction) {
  if (event.kind === 'progress') {
    return t('shell.importTasks.progress', { taskName: event.taskName, progress: event.progress });
  }
  return t(event.kind === 'success' ? 'shell.importTasks.success' : 'shell.importTasks.failure', {
    taskName: event.taskName
  });
}
