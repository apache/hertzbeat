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
