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

const monitorImportExtensions = ['.json', '.xlsx', '.yaml'] as const;
const monitorImportRoles = new Set(['ADMIN', 'USER']);

export const monitorImportAccept = monitorImportExtensions.join(',');

export type MonitorImportInvalidKind = 'required' | 'empty' | 'unsupported';
export type MonitorImportFailureKind = 'validation' | 'forbidden' | 'unavailable' | 'error';
export type MonitorImportDraft = { file: File | null };
export type MonitorImportState = {
  canImport: boolean;
  draft: MonitorImportDraft | null;
  invalid: MonitorImportInvalidKind | null;
  failure: MonitorImportFailureKind | null;
  busy: boolean;
};

export function userCanImportMonitors(roles: readonly string[]) {
  return roles.some(role => monitorImportRoles.has(role));
}

export function validateMonitorImportFile(
  file: File | null
): { valid: true; file: File } | { valid: false; reason: MonitorImportInvalidKind } {
  if (!file) return { valid: false, reason: 'required' };
  if (file.size === 0) return { valid: false, reason: 'empty' };
  const name = file.name.toLowerCase();
  if (!monitorImportExtensions.some(extension => name.endsWith(extension))) {
    return { valid: false, reason: 'unsupported' };
  }
  return { valid: true, file };
}
