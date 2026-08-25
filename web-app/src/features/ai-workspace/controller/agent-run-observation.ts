/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { Dispatch } from 'react';

import { getAgentRun } from '../api/agent-gateway-api';
import type { AgentGatewayEvent, AgentRunSnapshot } from '../model/agent-workspace-contract';
import type { AgentWorkspaceAction } from '../model/agent-workspace-reducer';

const activeObservationTimeoutMs = 5_000;
const activeObservationIntervalMs = 1_000;

type ObservationRefs = {
  isMounted: () => boolean;
  getStreamedSession: () => string | undefined;
  setLastRequest: () => void;
  setStreamedSession: (value?: string) => void;
  setConversation: (value?: string) => void;
};

export type RunProgress = { terminalError: boolean; activeRunUid?: string };

export function trackRunProgress(event: AgentGatewayEvent, progress: RunProgress) {
  if (event.type === 'ERROR') progress.terminalError = true;
  if (event.type !== 'RUN_STATUS') return;
  if (activeStatus(event)) {
    if (event.runUid) progress.activeRunUid = event.runUid;
    return;
  }
  progress.terminalError = terminalStatusIsError(event);
}

export async function observeActiveRun(
  runUid: string,
  conversationId: string,
  abort: AbortController,
  refs: ObservationRefs,
  dispatch: Dispatch<AgentWorkspaceAction>,
  converge: (sessionUid?: string, preserveRun?: boolean, signal?: AbortSignal) => Promise<void>
) {
  const observation = await pollRun(runUid, abort.signal);
  const { snapshot } = observation;
  const terminalError =
    snapshot.status !== 'SUCCEEDED' && snapshot.status !== 'RUNNING' && snapshot.status !== 'CREATED';
  publishAgentEvent(runStatusEvent(snapshot, conversationId, observation.expired, false, true), refs, abort, dispatch);
  await converge(refs.getStreamedSession(), terminalError || observation.expired, abort.signal);
  if (!terminalError && !observation.expired) refs.setLastRequest();
}

export function publishAgentEvent(
  event: AgentGatewayEvent,
  refs: ObservationRefs,
  abort: AbortController,
  dispatch: Dispatch<AgentWorkspaceAction>
) {
  if (!refs.isMounted() || abort.signal.aborted) return;
  if (event.sessionUid) refs.setStreamedSession(event.sessionUid);
  if (event.conversationId) refs.setConversation(event.conversationId);
  dispatch(event);
}

export function runStatusEvent(
  snapshot: AgentRunSnapshot,
  conversationId: string,
  observationExpired = false,
  resultAlreadyVisible = false,
  requestAvailable = false
): AgentGatewayEvent {
  const active = snapshot.status === 'CREATED' || snapshot.status === 'RUNNING';
  const terminalRetry = snapshot.status === 'FAILED' || snapshot.status === 'CANCELLED';
  return {
    type: 'RUN_STATUS',
    eventId: `${snapshot.runUid}:status:${snapshot.status.toLowerCase()}`,
    conversationId,
    sessionUid: snapshot.sessionUid,
    runUid: snapshot.runUid,
    itemId: null,
    payload: {
      status: snapshot.status,
      result: snapshot.result,
      errorMessage: snapshot.errorMessage,
      replayAvailable: snapshot.replayAvailable,
      observationExpired,
      resultAlreadyVisible,
      recoveryAvailable: requestAvailable && active,
      retryAvailable: requestAvailable && terminalRetry
    },
    timestamp: Date.now()
  };
}

function activeStatus(event: AgentGatewayEvent) {
  const status = typeof event.payload.status === 'string' ? event.payload.status.toUpperCase() : '';
  return status === 'CREATED' || status === 'RUNNING';
}

function terminalStatusIsError(event: AgentGatewayEvent) {
  const status = typeof event.payload.status === 'string' ? event.payload.status.toUpperCase() : '';
  return status === 'FAILED' || status === 'CANCELLED' || status === 'RECOVERY_REQUIRED';
}

async function pollRun(runUid: string, signal: AbortSignal): Promise<{ snapshot: AgentRunSnapshot; expired: boolean }> {
  const deadline = Date.now() + activeObservationTimeoutMs;
  for (;;) {
    const snapshot = await getAgentRun(runUid, signal);
    if (snapshot.status !== 'CREATED' && snapshot.status !== 'RUNNING') return { snapshot, expired: false };
    if (Date.now() >= deadline) return { snapshot, expired: true };
    await abortableDelay(Math.min(activeObservationIntervalMs, deadline - Date.now()), signal);
  }
}

function abortableDelay(delayMs: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const abort = () => {
      window.clearTimeout(timeout);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const timeout = window.setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, delayMs);
    signal.addEventListener('abort', abort, { once: true });
  });
}
