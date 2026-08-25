/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
