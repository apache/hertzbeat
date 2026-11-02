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

import { agentToolStatus } from './agent-runtime-status';
import type { AgentWorkspaceViewModel } from './agent-workspace-view-model';

export type AgentExecutionPhase = 'thinking' | 'findingTools' | 'queryingLogs' | 'executingTool' | 'responding';

export function agentExecutionPhase(controller: AgentWorkspaceViewModel): AgentExecutionPhase | undefined {
  if (!observing(controller)) return undefined;
  const running = [...controller.run.tools].reverse().find(tool => agentToolStatus(tool.status) === 'RUNNING');
  if (running?.toolName === 'tool.search') return 'findingTools';
  if (running?.toolName.startsWith('logs.')) return 'queryingLogs';
  if (running) return 'executingTool';
  if (controller.run.messages.some(message => message.status === 'streaming' && message.text)) return 'responding';
  return 'thinking';
}

function observing(controller: AgentWorkspaceViewModel) {
  if (controller.invalidTarget || controller.failure || controller.run.observationExpired) return false;
  if (controller.run.status === 'error' || controller.run.status === 'complete') return false;
  return controller.streaming || controller.run.status === 'running';
}
