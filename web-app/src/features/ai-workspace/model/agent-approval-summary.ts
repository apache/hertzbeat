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

import { isAgentCollectionPreview, type AgentCollectionPreview } from './agent-collection-preview';
import {
  isAgentPersonalWorkspacePreview,
  type AgentPersonalWorkspacePreview
} from './agent-personal-workspace-preview';

import { isAgentInhibitionPreview, type AgentInhibitionPreview } from './agent-inhibition-preview';
export type AgentApprovalSummary = {
  inhibition?: AgentInhibitionPreview | null;
  personal?: AgentPersonalWorkspacePreview | null;
  collection?: AgentCollectionPreview | null;
  version: 'approval-summary.v1';
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'PAUSE' | 'RESUME' | 'REVIEW';
  targetCount: number;
  inputHash: string | null;
  complete: boolean;
  maskedFields: string[];
  targets: {
    kind: 'WEBSITE' | 'MONITOR' | 'RESOURCE';
    id: string | null;
    origin: string | null;
    pathFingerprint: string | null;
    keyFingerprint: string | null;
    intervals: number | null;
    timeout: number | null;
  }[];
  changes: { field: 'INTERVALS' | 'TIMEOUT' | 'RETRY_PREFLIGHT'; value: string }[];
};

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function nullable(value: unknown, pattern: RegExp) {
  return value === null || (typeof value === 'string' && pattern.test(value));
}
function integer(value: unknown, max: number) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max;
}

function isTarget(target: unknown): boolean {
  return (
    record(target) &&
    Object.keys(target).every(key =>
      ['kind', 'id', 'origin', 'pathFingerprint', 'keyFingerprint', 'intervals', 'timeout'].includes(key)
    ) &&
    ['WEBSITE', 'MONITOR', 'RESOURCE'].includes(String(target.kind)) &&
    nullable(target.id, /^[1-9][0-9]{0,18}$/) &&
    nullable(target.origin, /^https?:\/\/(?:[A-Za-z0-9.-]+|\[[0-9A-Fa-f:]+\])(?::[0-9]{1,5})?$/) &&
    nullable(target.pathFingerprint, /^[a-f0-9]{16}$/) &&
    nullable(target.keyFingerprint, /^[a-f0-9]{16}$/) &&
    (target.intervals === null || integer(target.intervals, 86400)) &&
    (target.timeout === null || integer(target.timeout, 10000))
  );
}
function isMask(field: unknown): boolean {
  return (
    typeof field === 'string' &&
    ['FREE_TEXT', 'URL_PATH', 'URL_QUERY', 'PARAMETERS', 'UNSUPPORTED', 'BOUND_INPUT_UNAVAILABLE'].includes(field)
  );
}

/** Reject unknown/free-text summary fields before displaying either SSE or query projection. */
export function isAgentApprovalSummary(value: unknown): value is AgentApprovalSummary {
  if (
    !record(value) ||
    !Object.keys(value).every(key =>
      [
        'version',
        'operation',
        'targetCount',
        'inputHash',
        'complete',
        'maskedFields',
        'targets',
        'changes',
        'collection',
        'personal',
        'inhibition'
      ].includes(key)
    )
  )
    return false;
  if (!validHeader(value)) return false;
  if (!validCollection(value.collection)) return false;
  if (!validExtensions(value)) return false;
  if (!Array.isArray(value.maskedFields) || value.maskedFields.length > 8 || !value.maskedFields.every(isMask))
    return false;
  if (!Array.isArray(value.targets) || value.targets.length > 100 || !value.targets.every(isTarget)) return false;
  return validChanges(value.changes);
}

function validChanges(changes: unknown): boolean {
  return (
    Array.isArray(changes) &&
    changes.length <= 8 &&
    changes.every(
      change =>
        record(change) &&
        Object.keys(change).every(key => ['field', 'value'].includes(key)) &&
        ['INTERVALS', 'TIMEOUT', 'RETRY_PREFLIGHT'].includes(String(change.field)) &&
        typeof change.value === 'string' &&
        (change.field === 'RETRY_PREFLIGHT' ? /^(true|false)$/.test(change.value) : /^[0-9]{1,5}$/.test(change.value))
    )
  );
}

function validHeader(value: Record<string, unknown>): boolean {
  return !(
    value.version !== 'approval-summary.v1' ||
    !['CREATE', 'UPDATE', 'DELETE', 'PAUSE', 'RESUME', 'REVIEW'].includes(String(value.operation)) ||
    !integer(value.targetCount, 262144) ||
    typeof value.complete !== 'boolean' ||
    !nullable(value.inputHash, /^[a-f0-9]{64}$/)
  );
}

function personalLayoutOperation(preview: AgentPersonalWorkspacePreview) {
  if (preview.request === null) return 'DELETE';
  return preview.expectedRevision === 'missing' ? 'CREATE' : 'UPDATE';
}

function validPersonal(value: Record<string, unknown>): boolean {
  if (value.personal == null) return true;
  if (
    !isAgentPersonalWorkspacePreview(value.personal) ||
    value.collection != null ||
    value.inhibition != null ||
    value.targetCount !== 1 ||
    value.complete !== true ||
    typeof value.inputHash !== 'string'
  )
    return false;
  return value.operation === (value.personal.kind === 'FAVORITE' ? 'UPDATE' : personalLayoutOperation(value.personal));
}

function validCollection(value: unknown): boolean {
  return value == null || isAgentCollectionPreview(value);
}

function validInhibition(v: Record<string, unknown>): boolean {
  if (v.inhibition == null) return true;
  return (
    v.personal == null &&
    v.collection == null &&
    v.targetCount === 1 &&
    v.complete === true &&
    typeof v.inputHash === 'string' &&
    isAgentInhibitionPreview(v.inhibition, v.operation)
  );
}

function validExtensions(value: Record<string, unknown>): boolean {
  return validPersonal(value) && validInhibition(value);
}
