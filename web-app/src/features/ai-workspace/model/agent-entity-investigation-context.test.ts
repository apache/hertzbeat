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

import { describe, expect, it } from 'vitest';
import { buildAgentWorkspacePath, parseAgentTargetContextFromLocation } from './agent-workspace-context';
import { entityInvestigationTarget } from './agent-entity-investigation-context';
const window = { from: 1760000000000, to: 1760000060000, timeZone: 'UTC' };
describe('entity investigation entry', () => {
  it('roundtrips the fixed entity/time scope on a direct entry', () => {
    const target = entityInvestigationTarget(42, window)!;
    const url = new URL(buildAgentWorkspacePath(target), 'http://local');
    expect(parseAgentTargetContextFromLocation(url)).toMatchObject({ kind: 'valid', target });
  });
  it('rejects duplicate, oversized, unbounded or client-asserted authority scope', () => {
    const path = buildAgentWorkspacePath(entityInvestigationTarget(42, window)!);
    for (const suffix of ['&entityId=43', '&authority=trusted', '&serviceName=other']) {
      expect(parseAgentTargetContextFromLocation(new URL(path + suffix, 'http://local')).kind).toBe('invalid');
    }
    expect(entityInvestigationTarget(42, { ...window, to: window.from })).toBeUndefined();
    expect(entityInvestigationTarget(42, { ...window, to: window.from + 8 * 86400000 })).toBeUndefined();
    expect(entityInvestigationTarget(42, { ...window, timeZone: 'invalid' })).toBeUndefined();
  });
  it('accepts exactly 24 hours and rejects even one millisecond more', () => {
    expect(entityInvestigationTarget(42, { ...window, to: window.from + 86400000 })).toBeDefined();
    expect(entityInvestigationTarget(42, { ...window, to: window.from + 86400001 })).toBeUndefined();
  });
  it('retains the existing entity-only entry', () => {
    expect(buildAgentWorkspacePath({ entityId: 42 })).toBe('/ai?source=entity&entityId=42');
  });
});
