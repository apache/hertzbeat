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
import { Alert, Button, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { isCancelledBeforeApprovalOnly, type AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import { AgentExecutionSummary } from './agent-execution-summary';
import styles from './agent-workspace-conversation.module.css';
import executionStyles from './agent-workspace-execution.module.css';
import { formatElapsed, toolStatusColor, toolStatusLabel } from './agent-workspace-format';

export function ExecutionStatus({
  controller,
  contextOpen,
  onToggleContext
}: {
  controller: AgentWorkspaceViewModel;
  contextOpen: boolean;
  onToggleContext: () => void;
}) {
  const { t } = useTranslation();
  if (controller.invalidTarget) return null;
  const activity = controller.run.tools.length ? (
    <details className={executionStyles.executionDetails}>
      <summary className={executionStyles.executionSummary}>{t('aiWorkspace.context.activity')}</summary>
      <ConversationActivity
        tools={controller.run.tools}
        onOpenContext={() => {
          if (!contextOpen) onToggleContext();
        }}
      />
    </details>
  ) : null;
  return (
    <>
      {controller.run.executionSummary ? (
        <AgentExecutionSummary
          summary={controller.run.executionSummary}
          cancelledBeforeApproval={isCancelledBeforeApprovalOnly(controller.run)}
        />
      ) : (
        <ToolFailures tools={controller.run.tools} />
      )}
      {controller.run.status === 'error' &&
      controller.run.executionSummary?.stopReason &&
      controller.run.retryAvailable &&
      !controller.batch?.progress ? (
        <Button size="small" onClick={() => void controller.actions.retry()}>
          {t('common.retry')}
        </Button>
      ) : null}
      {activity}
    </>
  );
}

function ToolFailures({ tools }: { tools: AgentWorkspaceViewModel['run']['tools'] }) {
  const { t } = useTranslation();
  const count = tools.filter(
    tool =>
      tool.status.toUpperCase() === 'FAILED' ||
      tool.status.toUpperCase() === 'DENIED' ||
      (tool.status === 'UNKNOWN' && Boolean(tool.errorMessage))
  ).length;
  return count ? (
    <details className={executionStyles.executionDetails} data-status="PARTIAL">
      <summary className={executionStyles.executionSummary}>
        {t('aiWorkspace.executionSummary.compact.PARTIAL')}
      </summary>
      <Alert type="warning" showIcon message={t('aiWorkspace.toolFailureWarning', { count })} />
    </details>
  ) : null;
}

function ConversationActivity({
  onOpenContext,
  tools
}: {
  onOpenContext: () => void;
  tools: AgentWorkspaceViewModel['run']['tools'];
}) {
  const { t } = useTranslation();
  return (
    <section className={styles.inlineActivity} aria-label={t('aiWorkspace.context.activity')}>
      {tools.map(tool => (
        <button
          aria-controls="agent-run-context"
          aria-label={tool.toolName}
          className={styles.inlineTool}
          key={tool.toolCallId}
          title={t('aiWorkspace.context.open')}
          type="button"
          onClick={onOpenContext}
        >
          <CodeOutlined />
          <span className={styles.inlineToolName}>{tool.toolName}</span>
          {tool.elapsedMs === undefined ? null : (
            <Typography.Text type="secondary">{formatElapsed(tool.elapsedMs)}</Typography.Text>
          )}
          <Tag bordered={false} color={toolStatusColor(tool.status)}>
            {toolStatusLabel(tool.status, t)}
          </Tag>
          <RightOutlined className={styles.inlineToolChevron} />
        </button>
      ))}
    </section>
  );
}
