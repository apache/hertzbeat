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

import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import { AgentWorkspaceContextPane } from './agent-workspace-context-pane';
import { AgentWorkspaceConversation } from './agent-workspace-conversation';
import { AgentWorkspaceSessionPane } from './agent-workspace-session-pane';
import { useState } from 'react';
import styles from './agent-workspace-view.module.css';

export function AgentWorkspaceView({
  controller,
  isAdmin,
  onOpenProviders,
  onOpenSchedules
}: {
  controller: AgentWorkspaceViewModel;
  isAdmin: boolean;
  onOpenProviders: () => void;
  onOpenSchedules: () => void;
}) {
  const [contextOpen, setContextOpen] = useState(false);
  return (
    <div className={styles.workspace} data-context-open={contextOpen}>
      <AgentWorkspaceSessionPane
        controller={controller}
        isAdmin={isAdmin}
        onOpenProviders={onOpenProviders}
        onOpenSchedules={onOpenSchedules}
      />
      <AgentWorkspaceConversation
        contextOpen={contextOpen}
        controller={controller}
        onToggleContext={() => setContextOpen(current => !current)}
      />
      {contextOpen ? (
        <AgentWorkspaceContextPane controller={controller} isAdmin={isAdmin} onClose={() => setContextOpen(false)} />
      ) : null}
    </div>
  );
}
