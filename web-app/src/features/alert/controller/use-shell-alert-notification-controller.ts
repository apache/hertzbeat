/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import {
  browserAlertNotificationRuntime,
  type BrowserAlertNotificationRuntime
} from '@/core/notification/browser-alert-notification';

import { loadAlertGroups, loadAlertSummary } from '../api/alert-api';
import { alertFailureKind, type AlertQuery } from '../model/alert-model';
import {
  buildShellAlertItems,
  type ShellAlertCountState,
  type ShellAlertListState,
  type ShellAlertNotificationState
} from '../model/shell-alert-notification-model';
import { alertCenterQueryKeys } from './alert-center-query-keys';
import { useAlertCenterRealtimeRefresh } from './use-alert-center-realtime-refresh';
import { useShellAlertSoundController } from './use-shell-alert-sound-controller';

const shellAlertQuery: AlertQuery = {
  search: '',
  status: 'firing',
  severity: '',
  serviceName: '',
  serviceNamespace: '',
  environment: '',
  pageIndex: 0,
  pageSize: 8
};

type ShellAlertNotificationOptions = {
  locale: string | undefined;
  notificationTitle: string;
  notificationBody: string;
  onOpenAlerts: () => void;
  roles: readonly string[];
  runtime?: BrowserAlertNotificationRuntime;
};

export function useShellAlertNotificationController(
  options: ShellAlertNotificationOptions
): ShellAlertNotificationState {
  const client = useQueryClient();
  const sound = useShellAlertSoundController({
    ...options,
    runtime: options.runtime ?? browserAlertNotificationRuntime
  });
  const countQuery = useQuery({
    queryKey: alertCenterQueryKeys.summary(),
    queryFn: ({ signal }) => loadAlertSummary(signal),
    retry: false
  });
  const listQuery = useQuery({
    queryKey: alertCenterQueryKeys.groups(shellAlertQuery),
    queryFn: ({ signal }) => loadAlertGroups(shellAlertQuery, signal),
    retry: false
  });
  const refreshAlerts = useCallback(
    () => client.invalidateQueries({ queryKey: alertCenterQueryKeys.root() }),
    [client]
  );
  // One shell-owned stream refreshes the header and every mounted Alert Center query.
  useAlertCenterRealtimeRefresh(refreshAlerts, sound.onAlert);
  return {
    count: readCountState(countQuery.isPending, countQuery.error, countQuery.data),
    list: readListState(listQuery.isPending, listQuery.error, listQuery.data?.content),
    sound: sound.state,
    toggleSound: sound.toggleSound
  };
}

function readCountState(
  pending: boolean,
  error: Error | null,
  result: Awaited<ReturnType<typeof loadAlertSummary>> | undefined
): ShellAlertCountState {
  if (pending) return { kind: 'loading' };
  if (error) return { kind: alertFailureKind(error) };
  if (!result) return { kind: 'error' };
  // The backend summary total includes resolved history; dealNum is the resolved portion.
  return { kind: 'ready', total: Math.max(0, result.total - result.dealNum) };
}

function readListState(
  pending: boolean,
  error: Error | null,
  groups: Awaited<ReturnType<typeof loadAlertGroups>>['content'] | undefined
): ShellAlertListState {
  if (pending) return { kind: 'loading' };
  if (error) return { kind: alertFailureKind(error) };
  if (!groups) return { kind: 'error' };
  if (groups.length === 0) return { kind: 'empty' };
  return { kind: 'ready', items: buildShellAlertItems(groups) };
}
