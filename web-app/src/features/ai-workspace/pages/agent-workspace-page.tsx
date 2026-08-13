/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { AgentProviderDialog } from '../components/agent-provider-dialog';
import { AgentWorkspaceView } from '../components/agent-workspace-view';
import { useAgentWorkspacePageController } from '../controller/use-agent-workspace-page-controller';

export function AgentWorkspacePage() {
  const controller = useAgentWorkspacePageController();
  return (
    <>
      <AgentWorkspaceView
        controller={controller.workspace}
        isAdmin={controller.isAdmin}
        onOpenProviders={controller.openProviders}
      />
      {controller.isAdmin ? (
        <AgentProviderDialog
          controller={controller.providers}
          open={controller.providersOpen}
          onClose={controller.closeProviders}
        />
      ) : null}
    </>
  );
}
