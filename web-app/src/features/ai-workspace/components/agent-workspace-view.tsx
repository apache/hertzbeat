/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import { AgentWorkspaceContextPane } from './agent-workspace-context-pane';
import { AgentWorkspaceConversation } from './agent-workspace-conversation';
import { AgentWorkspaceSessionPane } from './agent-workspace-session-pane';
import styles from './agent-workspace-view.module.css';

export function AgentWorkspaceView({
  controller,
  isAdmin,
  onOpenProviders
}: {
  controller: AgentWorkspaceViewModel;
  isAdmin: boolean;
  onOpenProviders: () => void;
}) {
  return (
    <div className={styles.workspace}>
      <AgentWorkspaceSessionPane controller={controller} isAdmin={isAdmin} onOpenProviders={onOpenProviders} />
      <AgentWorkspaceConversation controller={controller} />
      <AgentWorkspaceContextPane controller={controller} isAdmin={isAdmin} />
    </div>
  );
}
