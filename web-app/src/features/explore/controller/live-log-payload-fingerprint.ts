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

import type { LiveLogRow } from '../model/explore-signal-contract';

// A non-cryptographic candidate key, never an equality decision. Input is a parsed JSON log row.
export function liveLogPayloadFingerprint(row: LiveLogRow): string {
  const payload = canonicalPayload(row);
  let hash = 2166136261;
  for (let index = 0; index < payload.length; index++) {
    hash = Math.imul(hash ^ payload.charCodeAt(index), 16777619);
  }
  return (hash >>> 0).toString(16);
}

function canonicalPayload(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalPayload).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const fields = value as Record<string, unknown>;
    return `{${Object.keys(fields)
      .sort()
      .map(key => `${JSON.stringify(key)}:${canonicalPayload(fields[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}
