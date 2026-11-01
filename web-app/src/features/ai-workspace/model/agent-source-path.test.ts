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
import { agentEvidenceSourcePath, agentTargetSourcePath } from './agent-source-path';
import type { AgentEvidence } from './agent-evidence';
const evidence: AgentEvidence = {
  evidenceId: 'ev1',
  runUid: 'run1',
  toolCallId: 't1',
  toolName: 'entity.get',
  signalType: 'entity',
  resourceType: 'entity',
  resourceId: '42',
  start: null,
  end: null,
  observationCount: 1,
  status: 'OBSERVED',
  summary: 'entity-record',
  partial: null
};
describe('agent native sources', () => {
  it('only creates native links for bounded structural resource identities', () => {
    expect(agentEvidenceSourcePath(evidence)).toBe('/entities/42');
    expect(agentEvidenceSourcePath({ ...evidence, resourceId: 'javascript:alert(1)' })).toBeUndefined();
    expect(agentEvidenceSourcePath({ ...evidence, resourceId: 'https://evil.test' })).toBeUndefined();
    expect(agentEvidenceSourcePath({ ...evidence, resourceType: 'url' })).toBeUndefined();
  });
  it('preserves query and time scope when opening logs', () => {
    const path = agentTargetSourcePath({
      log: {
        start: 1760000000000,
        end: 1760000060000,
        serviceName: 'checkout',
        search: 'failure',
        hideInternal: true,
        hideNoise: true,
        pageIndex: 0,
        pageSize: 20
      }
    });
    const params = new URL(path!, 'http://local').searchParams;
    expect(params.get('start')).toBe('1760000000000');
    expect(params.get('end')).toBe('1760000060000');
    expect(params.get('serviceName')).toBe('checkout');
    expect(params.get('query')).toBe('"failure"');
    expect(params.get('hideNoise')).toBe('true');
  });
});
