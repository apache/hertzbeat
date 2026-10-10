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

const alertRuleImportExtensions = ['.json', '.xlsx', '.yaml', '.yml'] as const;

export const alertRuleImportAccept = alertRuleImportExtensions.join(',');

export type AlertRuleImportInvalidKind = 'required' | 'empty' | 'unsupported';
export type AlertRuleImportFailureKind = 'validation' | 'forbidden' | 'unavailable' | 'error';
export type AlertRuleImportWriteOutcome = 'rejected' | 'uncertain';
export type AlertRuleImportFailure = {
  kind: AlertRuleImportFailureKind;
  outcome: AlertRuleImportWriteOutcome;
};
export type AlertRuleImportState = {
  draft: { file: File | null } | null;
  invalid: AlertRuleImportInvalidKind | null;
  failure: AlertRuleImportFailure | null;
  busy: boolean;
  inspectionRequired: boolean;
};

export function validateAlertRuleImportFile(
  file: File | null
): { valid: true; file: File } | { valid: false; reason: AlertRuleImportInvalidKind } {
  if (!file) return { valid: false, reason: 'required' };
  if (file.size === 0) return { valid: false, reason: 'empty' };
  const name = file.name.toLowerCase();
  if (!alertRuleImportExtensions.some(extension => name.endsWith(extension))) {
    return { valid: false, reason: 'unsupported' };
  }
  return { valid: true, file };
}
