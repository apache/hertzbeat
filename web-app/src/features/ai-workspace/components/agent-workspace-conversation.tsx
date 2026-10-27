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

import { AgentBatchProgress } from './agent-batch-progress';
import { Typography } from 'antd';
import { executionIdentity } from './agent-workspace-format';
import { ConversationNotices } from './agent-workspace-conversation-notices';
import { useTranslation } from 'react-i18next';

import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import { ConversationFooter, ConversationHeader } from './agent-workspace-conversation-chrome';
import { EarlierMessages } from './agent-workspace-earlier-messages';
import styles from './agent-workspace-conversation.module.css';
import { ExecutionStatus } from './agent-workspace-execution';
import { AgentWorkspaceMessage } from './agent-workspace-message';
import { useConversationScroll } from './use-conversation-scroll';
import { AgentWorkspaceWaiting } from './agent-workspace-waiting';

export function AgentWorkspaceConversation({
  controller,
  contextOpen,
  onToggleContext,
  onOpenHistory
}: {
  controller: AgentWorkspaceViewModel;
  contextOpen: boolean;
  onToggleContext: () => void;
  onOpenHistory?: (() => void) | undefined;
}) {
  const { t } = useTranslation();
  const { viewportRef, contentRef, onScroll, away, jumpToLatest } = useConversationScroll(controller);
  const recorded = controller.transcript.items.filter(
    item => item.role !== 'assistant' || item.text || item.errorMessage || !item.toolCalls?.length
  );
  const messages = [...recorded, ...controller.draftMessages, ...controller.run.messages];
  const sessionLoadIncomplete = controller.transcript.status === 'error';
  const empty = messages.length === 0 && !controller.failure && !controller.invalidTarget && !sessionLoadIncomplete;
  return (
    <section className={styles.investigation} data-empty={empty} aria-label={t('aiWorkspace.investigation.label')}>
      <ConversationHeader
        controller={controller}
        contextOpen={contextOpen}
        onToggleContext={onToggleContext}
        onOpenHistory={onOpenHistory}
      />
      <div
        className={styles.transcript}
        aria-live="polite"
        ref={viewportRef}
        onScroll={onScroll}
        tabIndex={0}
        role="region"
        aria-label={t('aiWorkspace.conversationHistory')}
      >
        <div ref={contentRef}>
          <EarlierMessages controller={controller} />
          {empty ? <EmptyConversation /> : null}
          {messages.map((message, index) => (
            <AgentWorkspaceMessage key={'id' in message ? message.id : index} message={message} />
          ))}
          <AgentWorkspaceWaiting controller={controller} />
          <AgentBatchProgress batch={controller.batch} controller={controller} />
          <ExecutionStatus
            key={`execution:${executionIdentity(controller)}`}
            controller={controller}
            contextOpen={contextOpen}
            onToggleContext={onToggleContext}
          />
          <ConversationNotices controller={controller} />
        </div>
      </div>
      <ConversationFooter controller={controller} away={away} jumpToLatest={jumpToLatest} />
    </section>
  );
}

function EmptyConversation() {
  const { t } = useTranslation();
  return (
    <div className={styles.emptyConversation}>
      <Typography.Title level={4}>{t('aiWorkspace.empty.title')}</Typography.Title>
      <Typography.Text type="secondary">{t('aiWorkspace.empty.description')}</Typography.Text>
    </div>
  );
}
