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

import { useQuery } from '@tanstack/react-query';
import { getAgentPermission } from '../api/agent-permission-api';
import { agentWorkspaceQueryKeys } from '../model/agent-batch';
import { effectivePermissionMode, type AgentPermissionControl } from '../model/agent-permission-mode';
import { useAgentPermissionCommands } from './use-agent-permission-commands';
import { useAgentPermissionReview } from './use-agent-permission-review';

function usePermissionQuery(sessionUid?: string) {
  return useQuery({
    queryKey: agentWorkspaceQueryKeys.permission(sessionUid),
    enabled: Boolean(sessionUid),
    queryFn: async ({ signal }) => ({ view: await getAgentPermission(sessionUid!, signal), receivedAt: Date.now() }),
    retry: false,
    refetchInterval: state => (state.state.data?.view.mode === 'FULL' ? 5000 : false)
  });
}

type PermissionContext = {
  sessionUid: string | undefined;
  query: ReturnType<typeof usePermissionQuery>;
  commands: ReturnType<typeof useAgentPermissionCommands>;
  review: ReturnType<typeof useAgentPermissionReview>;
};
function permissionActions({
  sessionUid,
  query,
  commands,
  review
}: PermissionContext): AgentPermissionControl['actions'] {
  const retryStatus = () => {
    void query.refetch();
  };
  return {
    requestFull: async () => {
      if (!sessionUid || !query.data?.view.fullAllowed || review.busy) return;
      commands.challenge.reset();
      commands.confirm.reset();
      const pending = review.open();
      try {
        await commands.challenge.mutateAsync({ sessionUid, ...pending });
      } catch {
        if (!pending.signal.aborted) retryStatus();
      }
    },
    confirm: async () => {
      if (!sessionUid || !review.current || !review.confirmAllowed) return;
      try {
        await commands.confirm.mutateAsync({
          sessionUid,
          challenge: review.current.challenge,
          acknowledged: review.acknowledged
        });
        review.close();
      } catch {
        retryStatus();
      }
    },
    revoke: async () => {
      if (!sessionUid || review.busy) return;
      try {
        await commands.revoke.mutateAsync(sessionUid);
        review.close();
      } catch {
        retryStatus();
      }
    },
    dismiss: review.close,
    acknowledge: review.acknowledge,
    reload: async () => {
      await query.refetch();
    }
  };
}

function permissionPhase(
  sessionUid: string | undefined,
  query: ReturnType<typeof usePermissionQuery>
): AgentPermissionControl['phase'] {
  if (!sessionUid) return 'unselected';
  if (query.isPending) return 'loading';
  return query.isError ? 'error' : 'ready';
}

export function useAgentPermissionMode(sessionUid?: string): AgentPermissionControl {
  const query = usePermissionQuery(sessionUid);
  const commands = useAgentPermissionCommands();
  const changing = commands.confirm.isPending || commands.revoke.isPending;
  const review = useAgentPermissionReview(
    sessionUid,
    query.data?.view.mode,
    commands.challenge.data,
    changing,
    commands.challenge.isPending
  );
  return {
    phase: permissionPhase(sessionUid, query),
    mode: query.data ? effectivePermissionMode(query.data.view, query.data.receivedAt, review.now) : 'MANUAL',
    ...(query.data?.view.expiresAt ? { expiresAt: query.data.view.expiresAt } : {}),
    fullAllowed: Boolean(query.data?.view.fullAllowed && !query.isError),
    dialogOpen: review.dialogOpen,
    busy: review.busy,
    acknowledged: review.acknowledged,
    remainingSeconds: review.remainingSeconds,
    challengeExpired: review.expired,
    confirmAllowed: review.confirmAllowed,
    error: commands.challenge.isError || commands.confirm.isError || commands.revoke.isError,
    actions: permissionActions({ sessionUid, query, commands, review })
  };
}
