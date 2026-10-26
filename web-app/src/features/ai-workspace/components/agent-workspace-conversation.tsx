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
import { Button, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import { ConversationFooter, ConversationHeader } from './agent-workspace-conversation-chrome';
import { EarlierMessages } from './agent-workspace-earlier-messages';
import styles from './agent-workspace-conversation.module.css';
import { ExecutionStatus } from './agent-workspace-execution';
import executionStyles from './agent-workspace-execution.module.css';
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

function ConversationNotices({ controller }: { controller: AgentWorkspaceViewModel }) {
  const { t } = useTranslation();
  const sessionLoadIncomplete = controller.transcript.status === 'error';
  return (
    <>
      {sessionLoadIncomplete ? <ConversationFailure message={t('aiWorkspace.sessionLoadIncomplete')} /> : null}
      {showRunFailure(controller) ? (
        <ConversationFailure
          key={`failure:${executionIdentity(controller)}`}
          message={runFailureMessage(controller, t)}
          technical={runFailureTechnical(controller)}
          {...(controller.run.retryAvailable && !controller.batch?.progress ? { retry: controller.actions.retry } : {})}
        />
      ) : null}
      {showPausedObservation(controller) ? (
        <ConversationPaused
          recoveryAvailable={controller.run.recoveryAvailable === true}
          recover={controller.actions.recover}
        />
      ) : null}
      {controller.failure && ['idle', 'running'].includes(controller.run.status) ? (
        <ConversationTransportFailure controller={controller} />
      ) : null}
      {controller.invalidTarget ? <ConversationFailure message={t('aiWorkspace.invalidTarget')} /> : null}
    </>
  );
}

function executionIdentity(controller: AgentWorkspaceViewModel) {
  return controller.run.runUid ?? controller.selectedSessionUid ?? 'new';
}

function runFailureTechnical(controller: AgentWorkspaceViewModel) {
  return controller.run.recoveryRequired || controller.run.targetFailure ? undefined : controller.run.errorMessage;
}

function showRunFailure(controller: AgentWorkspaceViewModel) {
  if (controller.batch?.progress) return false;
  const summary = controller.run.executionSummary;
  const coveredBySummary =
    summary?.status === 'PARTIAL' &&
    Boolean(summary.stopReason) &&
    !controller.run.recoveryRequired &&
    !controller.run.targetFailure;
  return (
    !controller.invalidTarget &&
    !coveredBySummary &&
    controller.run.status === 'error' &&
    Boolean(controller.run.errorMessage)
  );
}

function showPausedObservation(controller: AgentWorkspaceViewModel) {
  return !controller.invalidTarget && controller.run.status === 'running' && controller.run.observationExpired === true;
}

function runFailureMessage(controller: AgentWorkspaceViewModel, t: ReturnType<typeof useTranslation>['t']) {
  if (controller.run.recoveryRequired) return t('aiWorkspace.recoveryRequired');
  if (controller.run.targetFailure === 'mismatch') return t('aiWorkspace.targetMismatch');
  if (controller.run.targetFailure === 'unavailable') return t('aiWorkspace.targetUnavailable');
  return t('aiWorkspace.executionSummary.runFailed');
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

function ConversationTransportFailure({ controller }: { controller: AgentWorkspaceViewModel }) {
  const { t } = useTranslation();
  const failure = controller.transportFailure;
  const retry = async () => {
    if (controller.batch?.progress) {
      if (controller.selectedSessionUid) await controller.actions.selectSession(controller.selectedSessionUid);
      return;
    }
    await controller.actions.recover();
  };
  return (
    <ConversationFailure
      retry={retry}
      {...(failure
        ? {
            message: t(`aiWorkspace.transportFailure.${failure.code}`, { status: failure.httpStatus }),
            technical: t('aiWorkspace.transportFailure.requestId', { id: failure.requestId })
          }
        : {})}
    />
  );
}

function ConversationFailure({
  message,
  technical,
  retry
}: {
  message?: string;
  technical?: string | undefined;
  retry?: () => Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.failure} role="alert">
      <div>
        <span>{message || t('aiWorkspace.failure')}</span>
        {technical ? (
          <details className={executionStyles.executionDetails}>
            <summary className={executionStyles.executionSummary}>{t('aiWorkspace.executionSummary.details')}</summary>
            <p className={executionStyles.executionFacts}>{technical}</p>
          </details>
        ) : null}
      </div>
      {retry ? (
        <Button size="small" onClick={() => void retry()}>
          {t('common.retry')}
        </Button>
      ) : null}
    </div>
  );
}

function ConversationPaused({
  recoveryAvailable,
  recover
}: {
  recoveryAvailable: boolean;
  recover: () => Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.failure} role="status">
      <span>{t('aiWorkspace.activeObservationPaused')}</span>
      {recoveryAvailable ? (
        <Button size="small" onClick={() => void recover()}>
          {t('aiWorkspace.actions.recover')}
        </Button>
      ) : null}
    </div>
  );
}
