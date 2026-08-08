/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect } from 'react';

import type { SetupPhase } from '../model/setup-contract';
import type { SetupConfigurationAcknowledgement, SetupOperation } from '../model/setup-responses';

const MIN_STATUS_POLL_MILLIS = 250;
const MAX_STATUS_POLL_MILLIS = 5_000;

export function useSetupStatusConvergence(
  acknowledgement: SetupConfigurationAcknowledgement | null,
  serverPhase: SetupPhase,
  operation: Pick<SetupOperation, 'state' | 'nextPollAfterMillis'> | null,
  refetchStatus: () => Promise<unknown> | void
) {
  useEffect(() => {
    if (!shouldConvergeStatus(acknowledgement, serverPhase, operation)) return;
    const delay = Math.min(
      MAX_STATUS_POLL_MILLIS,
      Math.max(MIN_STATUS_POLL_MILLIS, acknowledgement?.nextPollAfterMillis ?? operation?.nextPollAfterMillis ?? 0)
    );
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => void tick(), delay);
    };
    const tick = async () => {
      if (!active) return;
      try {
        await refetchStatus();
      } catch {
        // The status query renders its own safe failure state; convergence remains retryable.
      } finally {
        // Schedule only after settlement so slow or rejected requests can never overlap.
        if (active) schedule();
      }
    };
    schedule();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [acknowledgement, operation, refetchStatus, serverPhase]);
}

function shouldConvergeStatus(
  acknowledgement: SetupConfigurationAcknowledgement | null,
  serverPhase: SetupPhase,
  operation: Pick<SetupOperation, 'state'> | null
) {
  if (serverPhase === 'application_starting') return true;
  if (acknowledgement?.state === 'awaiting_external_apply') {
    return serverPhase === 'configuration_required' || serverPhase === 'external_apply_required';
  }
  const restartPending = acknowledgement?.state === 'awaiting_restart' || operation?.state === 'awaiting_restart';
  return restartPending && serverPhase === 'configuration_required';
}
