/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { BrowserAlertPermission } from '@/core/notification/browser-alert-notification';

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
  | { kind: 'loading' }
  | { kind: 'ready'; total: number }
  | { kind: 'permission' }
  | { kind: 'unavailable' }
  | { kind: 'error' };

export type ShellAlertListState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'ready'; items: ShellAlertItem[] }
  | { kind: 'permission' }
  | { kind: 'unavailable' }
  | { kind: 'error' };

export type ShellAlertSoundState =
  | { kind: 'loading' }
  | { kind: 'permission' }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | {
      kind: 'ready';
      canToggle: boolean;
      muted: boolean;
      saving: boolean;
      permission: BrowserAlertPermission;
      failure: 'save_failed' | null;
    };

export type ShellAlertNotificationState = {
  count: ShellAlertCountState;
  list: ShellAlertListState;
  previewOpen: boolean;
  sound: ShellAlertSoundState;
  setPreviewOpen: (open: boolean) => void;
  toggleSound: () => Promise<void>;
};

export function shellAlertSoundCanToggle(roles: readonly string[]) {
  return roles.includes('ADMIN');
}

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
