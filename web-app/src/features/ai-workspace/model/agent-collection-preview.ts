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

export type AgentCollectionPreview = {
  version: 'inline-collection.v1';
  planId: string;
  monitorId: number;
  sourceRevision: string;
  planHash: string;
  collector: 'main-default-collector';
  operatingSystem: string;
  account: string;
  directory: string;
  argv: [string, string, string];
  oneShot: true;
  expiresAt: number;
};
function text(value: unknown, max: number): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= max &&
    Array.from(value).every(char => char.charCodeAt(0) >= 32 || [10, 13, 9].includes(char.charCodeAt(0)))
  );
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function isAgentCollectionPreview(value: unknown): value is AgentCollectionPreview {
  if (!record(value)) return false;
  const keys = [
    'version',
    'planId',
    'monitorId',
    'sourceRevision',
    'planHash',
    'collector',
    'operatingSystem',
    'account',
    'directory',
    'argv',
    'oneShot',
    'expiresAt'
  ];
  if (Object.keys(value).length !== keys.length || !Object.keys(value).every(k => keys.includes(k))) return false;
  return validIdentity(value) && validExecution(value);
}
function validIdentity(v: Record<string, unknown>) {
  return (
    v.version === 'inline-collection.v1' &&
    text(v.planId, 36) &&
    /^[a-f0-9-]{36}$/.test(v.planId) &&
    Number.isSafeInteger(v.monitorId) &&
    Number(v.monitorId) > 0 &&
    text(v.sourceRevision, 64) &&
    /^[a-f0-9]{64}$/.test(v.sourceRevision) &&
    text(v.planHash, 64) &&
    /^[a-f0-9]{64}$/.test(v.planHash) &&
    v.oneShot === true &&
    Number.isSafeInteger(v.expiresAt) &&
    Number(v.expiresAt) > 0
  );
}
function validExecution(v: Record<string, unknown>) {
  return (
    v.collector === 'main-default-collector' &&
    text(v.operatingSystem, 100) &&
    text(v.account, 100) &&
    text(v.directory, 4096) &&
    v.directory.startsWith('/') &&
    Array.isArray(v.argv) &&
    v.argv.length === 3 &&
    v.argv[0] === 'bash' &&
    v.argv[1] === '-c' &&
    text(v.argv[2], 16384)
  );
}
