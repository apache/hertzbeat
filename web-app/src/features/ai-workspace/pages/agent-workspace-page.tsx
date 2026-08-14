/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { AgentProviderDialog } from '../components/agent-provider-dialog';
import { AgentWorkspaceView } from '../components/agent-workspace-view';
import { useAgentWorkspacePageController } from '../controller/use-agent-workspace-page-controller';
import { applicationRoutePaths } from '@/shared/navigation/app-paths';
import { useNavigate } from 'react-router-dom';

export function AgentWorkspacePage() {
  const navigate = useNavigate();
  const controller = useAgentWorkspacePageController();
  return (
    <>
      <AgentWorkspaceView
        controller={controller.workspace}
        isAdmin={controller.isAdmin}
        onOpenProviders={controller.openProviders}
        onOpenSchedules={() => void navigate(applicationRoutePaths.aiSchedules)}
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
