/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { settingsPaths } from '@/shared/settings/settings-routes';

export type NotificationWorkspaceStep = 'channels' | 'receivers' | 'templates' | 'rules';
export type NotificationWorkspaceStatus = 'configured' | 'empty' | 'loading' | 'unavailable' | 'permission' | 'unknown';

export const notificationWorkspaceSteps = [
  { id: 'channels', path: settingsPaths.channels },
  { id: 'receivers', path: settingsPaths.receivers },
  { id: 'templates', path: settingsPaths.templates },
  { id: 'rules', path: settingsPaths.rules }
] as const satisfies readonly { id: NotificationWorkspaceStep; path: string }[];

type ChannelEvidence = 'configured' | 'missing' | 'loading' | 'permission' | 'unavailable' | 'invalid' | 'error';

export function notificationChannelStatus(email: ChannelEvidence, sms: ChannelEvidence): NotificationWorkspaceStatus {
  const evidence = [email, sms];
  if (evidence.includes('configured')) return 'configured';
  if (evidence.includes('loading')) return 'loading';
  if (evidence.includes('permission')) return 'permission';
  if (evidence.includes('unavailable')) return 'unavailable';
  if (evidence.every(kind => kind === 'missing')) return 'empty';
  return 'unknown';
}

type NotificationListEvidence =
  | { kind: 'ready'; total: number }
  | { kind: 'loading' | 'empty' | 'permission' | 'unavailable' | 'invalid' | 'error' | 'missing' };

export function notificationListStatus(state: NotificationListEvidence): NotificationWorkspaceStatus {
  if (state.kind === 'ready') {
    if (!Number.isFinite(state.total) || state.total < 0) return 'unknown';
    return state.total > 0 ? 'configured' : 'empty';
  }
  if (state.kind === 'empty') return 'empty';
  if (state.kind === 'loading') return 'loading';
  if (state.kind === 'permission') return 'permission';
  if (state.kind === 'unavailable') return 'unavailable';
  return 'unknown';
}

export function notificationWorkspacePath(step: NotificationWorkspaceStep) {
  return notificationWorkspaceSteps.find(item => item.id === step)!.path;
}
