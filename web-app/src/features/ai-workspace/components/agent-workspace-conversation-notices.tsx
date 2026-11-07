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

import { Button } from 'antd';
import { useEffect, useState } from 'react';
import { executionIdentity } from './agent-workspace-format';
import { useTranslation } from 'react-i18next';
import type { AgentModelRetry } from '../model/agent-workspace-retry';
import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import noticeStyles from './agent-workspace-conversation-notices.module.css';
import executionStyles from './agent-workspace-execution.module.css';

const retryCountdownIntervalMs = 250;

export function ConversationNotices({ controller }: { controller: AgentWorkspaceViewModel }) {
  const { t } = useTranslation();
  const sessionLoadIncomplete = controller.transcript.status === 'error';
  return (
    <>
      {sessionLoadIncomplete ? <ConversationFailure message={t('aiWorkspace.sessionLoadIncomplete')} /> : null}
      {retryRow(controller)}
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

function retryRow(controller: AgentWorkspaceViewModel) {
  const modelRetry = controller.run.modelRetry;
  const active = !controller.invalidTarget && controller.run.status === 'running' && Boolean(modelRetry);
  if (!active || !modelRetry) return null;
  // Remount per attempt so the countdown restarts from the new delay without a stale frame.
  return <ConversationRetrying key={modelRetry.attempt} modelRetry={modelRetry} />;
}

function ConversationRetrying({ modelRetry }: { modelRetry: AgentModelRetry }) {
  const { t } = useTranslation();
  const [remainingMs, setRemainingMs] = useState(modelRetry.delayMs ?? 0);
  useEffect(() => {
    if (modelRetry.delayMs === undefined) return;
    // Count down from the moment this wait started; a fresh event object restarts the epoch.
    const delay = modelRetry.delayMs;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setRemainingMs(Math.max(0, delay - (Date.now() - startedAt)));
    }, retryCountdownIntervalMs);
    return () => window.clearInterval(timer);
  }, [modelRetry]);
  const reason = modelRetry.errorMessage || t('aiWorkspace.modelRetryUnknownReason');
  const attempt = modelRetry.attempt ?? 1;
  const maxAttempts = modelRetry.maxAttempts ?? 1;
  const delaySeconds = Math.ceil(remainingMs / 1000);
  return (
    <div className={noticeStyles.failure} role="status" data-tone="progress">
      <span>
        {delaySeconds <= 0
          ? t('aiWorkspace.modelRetryingNoDelay', { reason, attempt, maxAttempts })
          : t('aiWorkspace.modelRetrying', { reason, delay: delaySeconds, attempt, maxAttempts })}
      </span>
    </div>
  );
}

function runFailureMessage(controller: AgentWorkspaceViewModel, t: ReturnType<typeof useTranslation>['t']) {
  if (controller.run.recoveryRequired) return t('aiWorkspace.recoveryRequired');
  if (controller.run.targetFailure === 'mismatch') return t('aiWorkspace.targetMismatch');
  if (controller.run.targetFailure === 'unavailable') return t('aiWorkspace.targetUnavailable');
  return t('aiWorkspace.executionSummary.runFailed');
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
    <div className={noticeStyles.failure} role="alert">
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
    <div className={noticeStyles.failure} role="status">
      <span>{t('aiWorkspace.activeObservationPaused')}</span>
      {recoveryAvailable ? (
        <Button size="small" onClick={() => void recover()}>
          {t('aiWorkspace.actions.recover')}
        </Button>
      ) : null}
    </div>
  );
}
