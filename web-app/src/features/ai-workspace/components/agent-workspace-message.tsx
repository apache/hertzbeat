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

import { MarkdownField } from '@refinedev/antd';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { agentToolStatus } from '../model/agent-runtime-status';
import type { AgentMessagePart } from '../model/agent-message-parts';
import styles from './agent-workspace-conversation.module.css';
import { MessageCopy } from './agent-workspace-message-copy';
import { formatAgentTimestamp } from './agent-workspace-format';

type ConversationMessage = {
  id: string | number;
  text: string;
  parts?: AgentMessagePart[];
  role?: string;
  toolName?: string;
  toolStatus?: string;
  errorMessage?: string;
  createdAt?: string | null;
  status?: 'streaming' | 'complete';
};

export function AgentWorkspaceMessage({ message }: { message: ConversationMessage }) {
  const { t } = useTranslation();
  const role = message.role ?? 'assistant';
  if (role === 'toolResult') return <ToolResultMessage message={message} />;
  const user = role === 'user';
  return (
    <article className={styles.message} data-role={role} data-message-key={String(message.id)}>
      <div className={styles.messageMeta}>
        {!user ? <img aria-hidden="true" className={styles.assistantMark} src="/assets/logo.svg" alt="" /> : null}
        <Typography.Text className={styles.messageRole ?? ''} type="secondary">
          {t(user ? 'aiWorkspace.roles.you' : 'aiWorkspace.roles.assistant')}
        </Typography.Text>
        <MessageTimestamp value={message.createdAt} />
      </div>
      {user ? (
        <div className={styles.messageText}>{message.text}</div>
      ) : (
        <div className={styles.assistantText}>
          <AssistantMessageBody message={message} />
        </div>
      )}
      <MessageError message={message.errorMessage} />
      {role === 'user' || role === 'assistant' ? (
        <MessageCopy
          text={
            message.parts?.length
              ? message.parts
                  .filter(part => part.type === 'text')
                  .map(part => part.text)
                  .join('')
              : message.text
          }
          generating={message.status === 'streaming'}
        />
      ) : null}
    </article>
  );
}

function AssistantMessageBody({ message }: { message: ConversationMessage }) {
  if (!message.parts?.length) return <MarkdownField value={message.text} />;
  return message.parts.map((part, index) => {
    if (part.type === 'toolCall') return <code key={part.id}>{part.name}</code>;
    return <MarkdownField key={index} value={part.text} />;
  });
}

function ToolResultMessage({ message }: { message: ConversationMessage }) {
  const { t } = useTranslation();
  const cancelled = agentToolStatus(message.toolStatus ?? 'UNKNOWN', message.errorMessage) === 'CANCELLED';
  return (
    <article className={styles.message} data-role="toolResult" data-message-key={String(message.id)}>
      <details>
        <summary className={styles.toolSummary}>
          <span className={styles.toolSummaryContent}>
            <code className={styles.messageRole}>{message.toolName}</code>
            <span>
              {t(cancelled ? 'aiWorkspace.context.cancelledBeforeExecution' : message.errorMessage ? 'aiWorkspace.executionSummary.toolFailed' : 'aiWorkspace.context.rawOutput')}
            </span>
            <MessageTimestamp value={message.createdAt} />
          </span>
        </summary>
        <pre className={styles.toolOutput}>{message.text}</pre>
        {cancelled ? <Typography.Text type="secondary">{message.errorMessage}</Typography.Text> : <MessageError message={message.errorMessage} />}
      </details>
    </article>
  );
}

function MessageTimestamp({ value }: { value: string | null | undefined }) {
  if (!value) return null;
  return (
    <Typography.Text className={styles.messageTime ?? ''} type="secondary">
      <time dateTime={value}>{formatAgentTimestamp(value)}</time>
    </Typography.Text>
  );
}

function MessageError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return (
    <Typography.Text className={styles.messageError ?? ''} type="danger">
      {message}
    </Typography.Text>
  );
}
