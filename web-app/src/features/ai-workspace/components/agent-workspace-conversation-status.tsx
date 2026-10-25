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
import { useTranslation } from 'react-i18next';

import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import type { AgentModelRetry } from '../model/agent-workspace-retry';
import styles from './agent-workspace-conversation.module.css';

const retryCountdownIntervalMs = 250;

/** Terminal and in-progress status rows rendered below the transcript messages. */
export function ConversationStatusRows({ controller }: { controller: AgentWorkspaceViewModel }) {
  const { t } = useTranslation();
  const sessionLoadIncomplete = controller.transcript.status === 'error';
  return (
    <>
      {sessionLoadIncomplete ? <ConversationFailure message={t('aiWorkspace.sessionLoadIncomplete')} /> : null}
      {showRunFailure(controller) ? (
        <ConversationFailure
          message={runFailureMessage(controller, t)}
          {...(controller.run.retryAvailable ? { retry: controller.actions.retry } : {})}
        />
      ) : null}
      {retryRow(controller)}
      {showPausedObservation(controller) ? (
        <ConversationPaused
          recoveryAvailable={controller.run.recoveryAvailable === true}
          recover={controller.actions.recover}
        />
      ) : null}
      {controller.failure ? <ConversationFailure retry={controller.actions.recover} /> : null}
      {controller.invalidTarget ? <ConversationFailure message={t('aiWorkspace.invalidTarget')} /> : null}
    </>
  );
}

function showRunFailure(controller: AgentWorkspaceViewModel) {
  return !controller.invalidTarget && controller.run.status === 'error' && Boolean(controller.run.errorMessage);
}

function showPausedObservation(controller: AgentWorkspaceViewModel) {
  return !controller.invalidTarget && controller.run.status === 'running' && controller.run.observationExpired === true;
}

function runFailureMessage(controller: AgentWorkspaceViewModel, t: ReturnType<typeof useTranslation>['t']) {
  if (controller.run.recoveryRequired) return t('aiWorkspace.recoveryRequired');
  if (controller.run.targetFailure === 'mismatch') return t('aiWorkspace.targetMismatch');
  if (controller.run.targetFailure === 'unavailable') return t('aiWorkspace.targetUnavailable');
  return controller.run.errorMessage ?? '';
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
    <div className={styles.failure} role="status" data-tone="progress">
      <span>
        {delaySeconds <= 0
          ? t('aiWorkspace.modelRetryingNoDelay', { reason, attempt, maxAttempts })
          : t('aiWorkspace.modelRetrying', { reason, delay: delaySeconds, attempt, maxAttempts })}
      </span>
    </div>
  );
}

function ConversationFailure({ message, retry }: { message?: string; retry?: () => Promise<void> }) {
  const { t } = useTranslation();
  return (
    <div className={styles.failure} role="alert">
      <span>{message || t('aiWorkspace.failure')}</span>
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
