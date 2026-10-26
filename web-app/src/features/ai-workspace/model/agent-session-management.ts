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

import type { AgentSession } from './agent-workspace-contract';

export type AgentSessionDeletion = {
  phase: 'idle' | 'loading' | 'confirming' | 'deleting';
  sessionUids: string[];
  activeCount: number;
  title?: string;
  error?: 'active' | 'unavailable' | undefined;
};

export function groupAgentSessions(sessions: AgentSession[], now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
  const week = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).getTime();
  const groups = new Map<string, AgentSession[]>();
  for (const session of sessions) {
    const timestamp = Date.parse(session.gmtUpdate ?? session.gmtCreate ?? '');
    const key =
      timestamp >= today ? 'today' : timestamp >= yesterday ? 'yesterday' : timestamp >= week ? 'week' : 'older';
    const items = groups.get(key) ?? [];
    items.push(session);
    groups.set(key, items);
  }
  return ['today', 'yesterday', 'week', 'older'].flatMap(key =>
    groups.has(key) ? [{ key, items: groups.get(key)! }] : []
  );
}

export function isAgentSessionActive(status: string) {
  return ['RUNNING', 'CREATED'].includes(status.toUpperCase());
}
