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

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  confirmAgentPermission,
  createAgentPermissionChallenge,
  revokeAgentPermission
} from '../api/agent-permission-api';
import { agentWorkspaceQueryKeys } from '../model/agent-batch';
import type { AgentPermissionChallenge, AgentPermissionSnapshot } from '../model/agent-permission-mode';

export function useAgentPermissionCommands() {
  const cache = useQueryClient();
  const save = (view: AgentPermissionSnapshot) =>
    cache.setQueryData(agentWorkspaceQueryKeys.permission(view.sessionUid), { view, receivedAt: Date.now() });
  const challenge = useMutation({
    mutationFn: async ({
      sessionUid,
      requestId,
      signal
    }: {
      sessionUid: string;
      requestId: string;
      signal: AbortSignal;
    }) => ({
      challenge: await createAgentPermissionChallenge(sessionUid, signal),
      requestId,
      receivedAt: Date.now()
    }),
    retry: false
  });
  const confirm = useMutation({
    mutationFn: ({
      sessionUid,
      challenge: selection,
      acknowledged
    }: {
      sessionUid: string;
      challenge: AgentPermissionChallenge;
      acknowledged: boolean;
    }) => confirmAgentPermission(sessionUid, selection, acknowledged),
    onSuccess: save,
    retry: false
  });
  const revoke = useMutation({ mutationFn: revokeAgentPermission, onSuccess: save, retry: false });
  return { challenge, confirm, revoke };
}
