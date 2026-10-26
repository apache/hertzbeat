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

import { z } from 'zod';
import { apiMessageGet, apiMessagePost } from '@/core/http/api-message';
import type { AgentPermissionChallenge, AgentPermissionSnapshot } from '../model/agent-permission-mode';

const epoch = z.number().int().nonnegative().safe();
const scope = z.literal('CURRENT_USER_SESSION_NORMAL_APPLICATION_WRITES');
export const agentPermissionPaths = {
  status: (sessionUid: string) => `/api/agent/sessions/${encodeURIComponent(sessionUid)}/permission-mode`,
  challenge: (sessionUid: string) => `${agentPermissionPaths.status(sessionUid)}/challenge`,
  confirm: (sessionUid: string) => `${agentPermissionPaths.status(sessionUid)}/confirm`,
  revoke: (sessionUid: string) => `${agentPermissionPaths.status(sessionUid)}/revoke`
};
const statusSchema = z
  .object({
    sessionUid: z.string(),
    mode: z.enum(['MANUAL', 'FULL']),
    generation: epoch,
    expiresAt: epoch,
    serverNow: epoch,
    fullAllowed: z.boolean(),
    noticeVersion: z.literal(1),
    scope,
    revocationGuardVersion: z.literal(1)
  })
  .strict()
  .superRefine((value, context) => {
    if (value.mode === 'FULL' && (!value.fullAllowed || value.expiresAt <= value.serverNow)) {
      context.addIssue({ code: 'custom', message: 'Invalid active permission grant' });
    }
  });
const challengeSchema = z
  .object({
    sessionUid: z.string(),
    challengeId: z.string().uuid(),
    generation: epoch,
    notBefore: epoch,
    expiresAt: epoch,
    serverNow: epoch,
    noticeVersion: z.literal(1),
    scope
  })
  .strict()
  .superRefine((value, context) => {
    if (value.notBefore - value.serverNow < 5000 || value.expiresAt <= value.notBefore) {
      context.addIssue({ code: 'custom', message: 'Invalid permission review window' });
    }
  });
function snapshot(input: unknown, expectedSessionUid: string): AgentPermissionSnapshot {
  const value = statusSchema.parse(input);
  if (value.sessionUid !== expectedSessionUid) throw new Error('Permission response scope mismatch');
  return {
    sessionUid: value.sessionUid,
    mode: value.mode,
    expiresAt: value.expiresAt,
    serverNow: value.serverNow,
    fullAllowed: value.fullAllowed
  };
}
export async function getAgentPermission(sessionUid: string, signal?: AbortSignal) {
  return snapshot(await apiMessageGet(agentPermissionPaths.status(sessionUid), signal ? { signal } : {}), sessionUid);
}
export async function createAgentPermissionChallenge(
  sessionUid: string,
  signal?: AbortSignal
): Promise<AgentPermissionChallenge> {
  const value = challengeSchema.parse(
    await apiMessagePost(agentPermissionPaths.challenge(sessionUid), {}, signal ? { signal } : undefined)
  );
  if (value.sessionUid !== sessionUid) throw new Error('Permission challenge scope mismatch');
  return {
    sessionUid: value.sessionUid,
    challengeId: value.challengeId,
    generation: value.generation,
    notBefore: value.notBefore,
    expiresAt: value.expiresAt,
    serverNow: value.serverNow,
    noticeVersion: value.noticeVersion
  };
}
export async function confirmAgentPermission(
  sessionUid: string,
  challenge: AgentPermissionChallenge,
  acknowledged: boolean
) {
  if (challenge.sessionUid !== sessionUid) throw new Error('Permission confirmation scope mismatch');
  return snapshot(
    await apiMessagePost(agentPermissionPaths.confirm(sessionUid), {
      challengeId: challenge.challengeId,
      generation: challenge.generation,
      noticeVersion: challenge.noticeVersion,
      acknowledged
    }),
    sessionUid
  );
}
export async function revokeAgentPermission(sessionUid: string) {
  return snapshot(await apiMessagePost(agentPermissionPaths.revoke(sessionUid), {}), sessionUid);
}
