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

export type InhibitionConfiguration = {
  name: string;
  sourceLabels: Record<string, string>;
  targetLabels: Record<string, string>;
  equalLabels: string[];
  enable: boolean;
};
export type AgentInhibitionPreview = {
  before?: InhibitionConfiguration | null;
  targetId: string | null;
  sourceHash: string | null;
  configuration: InhibitionConfiguration | null;
};
function record(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
function keys(v: Record<string, unknown>, expected: string[]) {
  return Object.keys(v).length === expected.length && Object.keys(v).every(k => expected.includes(k));
}
function text(v: unknown, max: number): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= max && v.trim() === v;
}
function labels(v: unknown) {
  if (!record(v) || Object.keys(v).length < 1 || Object.keys(v).length > 32) return false;
  let length = 0;
  for (const [k, value] of Object.entries(v)) {
    if (!text(k, 64) || !text(value, 256)) return false;
    length += k.length + value.length;
  }
  return length <= 1800;
}
function equalLabels(v: unknown) {
  return (
    Array.isArray(v) && v.length > 0 && v.length <= 32 && v.every(x => text(x, 64)) && new Set(v).size === v.length
  );
}
export function isInhibitionConfiguration(v: unknown): v is InhibitionConfiguration {
  return (
    record(v) &&
    keys(v, ['name', 'sourceLabels', 'targetLabels', 'equalLabels', 'enable']) &&
    text(v.name, 100) &&
    labels(v.sourceLabels) &&
    labels(v.targetLabels) &&
    equalLabels(v.equalLabels) &&
    typeof v.enable === 'boolean'
  );
}
export function isAgentInhibitionPreview(v: unknown, operation: unknown): v is AgentInhibitionPreview {
  if (!record(v) || !previewKeys(v) || !validBefore(v.before)) return false;
  if (operation === 'CREATE' && v.before != null) return false;
  if (operation === 'CREATE')
    return v.targetId === null && v.sourceHash === null && isInhibitionConfiguration(v.configuration);
  if (!validTarget(v)) return false;
  if (operation === 'DELETE') return v.configuration === null;
  return operation === 'UPDATE' && isInhibitionConfiguration(v.configuration);
}

function previewKeys(v: Record<string, unknown>): boolean {
  return (
    Object.keys(v).every(k => ['targetId', 'sourceHash', 'configuration', 'before'].includes(k)) &&
    ['targetId', 'sourceHash', 'configuration'].every(k => Object.hasOwn(v, k))
  );
}
function validBefore(v: unknown): boolean {
  return v == null || isInhibitionConfiguration(v);
}

function validTarget(v: Record<string, unknown>): boolean {
  return (
    typeof v.targetId === 'string' &&
    /^[1-9][0-9]{0,18}$/.test(v.targetId) &&
    typeof v.sourceHash === 'string' &&
    /^[a-f0-9]{64}$/.test(v.sourceHash)
  );
}
