/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { AlertGroup, AlertSeverity } from './alert-model';

const shellAlertPreviewLimit = 5;

export type ShellAlertItem = {
  id: number;
  title: string;
  detail: string | null;
  severity: Exclude<AlertSeverity, ''> | null;
  updatedAt: string | null;
};

export type ShellAlertCountState =
  { kind: 'loading' } | { kind: 'ready'; total: number } | { kind: 'unavailable' } | { kind: 'error' };

export type ShellAlertListState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'ready'; items: ShellAlertItem[] }
  | { kind: 'unavailable' }
  | { kind: 'error' };

export type ShellAlertNotificationState = {
  count: ShellAlertCountState;
  list: ShellAlertListState;
};

/** Projects only the compact evidence needed by the global header. */
export function buildShellAlertItems(groups: AlertGroup[]): ShellAlertItem[] {
  return groups.slice(0, shellAlertPreviewLimit).map(buildShellAlertItem);
}

function buildShellAlertItem(group: AlertGroup): ShellAlertItem {
  const childContent = readFirstChildContent(group);
  const title = readLabelName(group) ?? childContent ?? `#${group.id}`;
  return {
    id: group.id,
    title,
    detail: childContent && childContent !== title ? childContent : null,
    severity: readSeverity(group.commonLabels?.severity),
    updatedAt: group.gmtUpdate
  };
}

function readFirstChildContent(group: AlertGroup) {
  for (const alert of group.alerts) {
    const content = alert.content?.trim();
    if (content) return content;
  }
  return null;
}

function readLabelName(group: AlertGroup) {
  return group.commonLabels?.alertname?.trim() || group.groupLabels?.alertname?.trim() || null;
}

function readSeverity(value: string | undefined): Exclude<AlertSeverity, ''> | null {
  if (value === 'info' || value === 'warning' || value === 'critical' || value === 'emergency') return value;
  return null;
}
