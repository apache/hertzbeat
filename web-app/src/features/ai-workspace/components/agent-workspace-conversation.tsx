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

import { CodeOutlined, RightOutlined } from '@ant-design/icons';
import { Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import { ConversationComposer, ConversationHeader } from './agent-workspace-conversation-chrome';
import { ConversationStatusRows } from './agent-workspace-conversation-status';
import styles from './agent-workspace-conversation.module.css';
import { formatAgentTimestamp, formatElapsed, toolStatusColor } from './agent-workspace-format';

export function AgentWorkspaceConversation({
  controller,
  contextOpen,
  onToggleContext
}: {
  controller: AgentWorkspaceViewModel;
  contextOpen: boolean;
  onToggleContext: () => void;
}) {
  const { t } = useTranslation();
  const recorded = controller.transcript.items.filter(
    item => item.role !== 'assistant' || item.text || item.errorMessage || !item.toolCalls?.length
  );
  const messages = [...recorded, ...controller.draftMessages, ...controller.run.messages];
  const sessionLoadIncomplete = controller.transcript.status === 'error';
  const empty = messages.length === 0 && !controller.failure && !controller.invalidTarget && !sessionLoadIncomplete;
  return (
    <section className={styles.investigation} data-empty={empty} aria-label={t('aiWorkspace.investigation.label')}>
      <ConversationHeader controller={controller} contextOpen={contextOpen} onToggleContext={onToggleContext} />
      <div className={styles.transcript} aria-live="polite">
        {empty ? <EmptyConversation /> : null}
        {messages.map((message, index) => (
          <ConversationMessage key={'id' in message ? message.id : index} message={message} />
        ))}
        {controller.run.tools.length ? (
          <ConversationActivity
            contextOpen={contextOpen}
            tools={controller.run.tools}
            onOpenContext={() => {
              if (!contextOpen) onToggleContext();
            }}
          />
        ) : null}
        <ConversationStatusRows controller={controller} />
      </div>
      <ConversationComposer controller={controller} />
    </section>
  );
}

function ConversationMessage({
  message
}: {
  message: {
    id: string | number;
    text: string;
    role?: string;
    toolName?: string;
    errorMessage?: string;
    createdAt?: string | null;
  };
}) {
  const { t } = useTranslation();
  const role = message.role ?? 'assistant';
  const user = role === 'user';
  const toolResult = role === 'toolResult';
  return (
    <article className={styles.message} data-role={role}>
      <div className={styles.messageMeta}>
        {!user && !toolResult ? (
          <img aria-hidden="true" className={styles.assistantMark} src="/assets/logo.svg" alt="" />
        ) : null}
        {toolResult ? (
          <code className={styles.messageRole}>{message.toolName}</code>
        ) : (
          <Typography.Text className={styles.messageRole ?? ''} type="secondary">
            {user ? t('aiWorkspace.roles.you') : t('aiWorkspace.roles.assistant')}
          </Typography.Text>
        )}
        {message.createdAt ? (
          <Typography.Text className={styles.messageTime ?? ''} type="secondary">
            <time dateTime={message.createdAt}>{formatAgentTimestamp(message.createdAt)}</time>
          </Typography.Text>
        ) : null}
      </div>
      <div className={styles.messageText}>{message.text}</div>
      {message.errorMessage ? (
        <Typography.Text className={styles.messageError ?? ''} type="danger">
          {message.errorMessage}
        </Typography.Text>
      ) : null}
    </article>
  );
}

function ConversationActivity({
  contextOpen,
  onOpenContext,
  tools
}: {
  contextOpen: boolean;
  onOpenContext: () => void;
  tools: AgentWorkspaceViewModel['run']['tools'];
}) {
  const { t } = useTranslation();
  return (
    <section className={styles.inlineActivity} aria-label={t('aiWorkspace.context.activity')}>
      {tools.map(tool => (
        <button
          aria-expanded={contextOpen}
          aria-label={tool.toolName}
          className={styles.inlineTool}
          key={tool.toolCallId}
          type="button"
          onClick={onOpenContext}
        >
          <CodeOutlined />
          <span className={styles.inlineToolName}>{tool.toolName}</span>
          {tool.elapsedMs === undefined ? null : (
            <Typography.Text type="secondary">{formatElapsed(tool.elapsedMs)}</Typography.Text>
          )}
          <Tag bordered={false} color={toolStatusColor(tool.status)}>
            {tool.status === 'UNKNOWN' ? t('aiWorkspace.context.statusUnknown') : tool.status}
          </Tag>
          <RightOutlined className={styles.inlineToolChevron} />
        </button>
      ))}
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
