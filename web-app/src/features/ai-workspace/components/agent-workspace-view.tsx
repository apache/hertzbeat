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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [historyOpen, setHistoryOpen] = useState(false);
  const targetKey = controller.target ? JSON.stringify(controller.target) : '';
  const [contextPreference, setContextPreference] = useState<{ key: string; open: boolean }>();
  const contextOpen =
    contextPreference?.key === targetKey
      ? contextPreference.open
      : Boolean(targetKey && controller.run.status === 'idle');
  const setContextOpen = (open: boolean) => setContextPreference({ key: targetKey, open });
  return (
    <div className={styles.workspace} data-ai-workspace="true" data-context-open={contextOpen}>
      {historyOpen ? (
        <button
          className={styles.historyBackdrop}
          aria-label={t('aiWorkspace.sessions.close')}
          onClick={() => setHistoryOpen(false)}
        />
      ) : null}
      <AgentWorkspaceSessionPane
        controller={controller}
        isAdmin={isAdmin}
        mobileOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onOpenProviders={onOpenProviders}
        onOpenSchedules={onOpenSchedules}
      />
      <AgentWorkspaceConversation
        onOpenHistory={() => setHistoryOpen(true)}
        contextOpen={contextOpen}
        controller={controller}
        onToggleContext={() => setContextOpen(!contextOpen)}
      />
      {contextOpen ? (
        <AgentWorkspaceContextPane controller={controller} isAdmin={isAdmin} onClose={() => setContextOpen(false)} />
      ) : null}
    </div>
  );
}
