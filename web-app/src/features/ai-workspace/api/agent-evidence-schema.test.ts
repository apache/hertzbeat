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
import { agentRunSnapshotSchema } from './agent-gateway-schema';
import { agentRunTargetSchema, agentSourceTargetSchema } from './agent-target-schema';
import { projectAgentSourceTarget } from './agent-source-target-projection';
const snapshot = {
  runUid: 'r',
  sessionUid: 's',
  messageId: 'm',
  status: 'SUCCEEDED',
  target: null,
  result: 'ok',
  errorMessage: null,
  replayAvailable: true,
  startedAt: null,
  completedAt: null
};
const target = { entityId: 42, signal: { type: 'investigation' as const, start: 1000, end: 2000, timezone: 'UTC' } };
describe('agent evidence and investigation wire', () => {
  it('preserves absent evidence on older snapshots and empty evidence on new ones', () => {
    expect(agentRunSnapshotSchema.parse(snapshot).evidence).toBeUndefined();
    expect(agentRunSnapshotSchema.parse({ ...snapshot, evidence: [] }).evidence).toEqual([]);
  });
  it('accepts structured observations but refuses unsolicited link or HTML fields', () => {
    const evidence = {
      evidenceId: 'ev',
      runUid: 'r',
      toolCallId: 't',
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
    expect(agentRunSnapshotSchema.parse({ ...snapshot, evidence: [evidence] }).evidence?.[0]?.partial).toBeNull();
    expect(
      agentRunSnapshotSchema.safeParse({ ...snapshot, evidence: [{ ...evidence, url: 'https://evil.test' }] }).success
    ).toBe(false);
  });
  it('projects only the bounded entity source contract', () => {
    expect(agentSourceTargetSchema.parse(projectAgentSourceTarget(target))).toEqual(target);
    expect(agentSourceTargetSchema.safeParse({ ...target, authority: {} }).success).toBe(false);
  });
  it('reads canonical entity and incident targets without exposing authority', () => {
    const authority = { bindingId: 42, version: 'entity-investigation-authority.v1', hash: `sha256:${'a'.repeat(64)}` };
    const canonical = {
      ...target,
      version: 'entity-investigation.v1',
      service: { name: 'checkout', namespace: 'shop', environment: 'prod' },
      authority
    };
    expect(agentRunTargetSchema.parse(canonical)).not.toHaveProperty('authority');
    expect(agentRunTargetSchema.parse({ ...canonical, service: null })).not.toHaveProperty('service');
    const incident = {
      version: 'incident.v1',
      alertId: 7,
      alertType: 'single',
      authority,
      incident: { analysisPolicyId: 42, alertIds: [7, 8], windowStartedAt: 1000, end: 2000 }
    };
    expect(agentRunTargetSchema.parse(incident)).toHaveProperty('incident.alertIds', [7, 8]);
  });
});
