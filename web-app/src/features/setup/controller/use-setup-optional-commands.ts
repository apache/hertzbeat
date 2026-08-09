/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useRef, useState } from 'react';

import { completeSetup, saveSetupOptions } from '../api/setup-api';
import type { SetupStatus, SetupWarningCode } from '../model/setup-contract';
import {
  createOptionalOptionsRequest,
  type SetupCompleteResponse,
  type SetupOptionalDraft
} from '../model/setup-optional';
import type { SetupStatusRefresh } from './setup-status-refresh';
import { setupWriteOutcome } from './setup-write-outcome';
import type { SetupWriteBoundary } from './use-setup-write-boundary';

type CommandDependencies = {
  status: SetupStatus;
  draftRef: { current: SetupOptionalDraft };
  refresh: SetupStatusRefresh;
  startWrite: SetupWriteBoundary;
  clearMailSecret: () => void;
  resetMailValidation: () => void;
  onCompleted: (response: SetupCompleteResponse) => void;
};

export function useSetupOptionalCommands(dependencies: CommandDependencies) {
  const save = useOptionsCommand(dependencies);
  const completion = useCompletionCommand(dependencies);
  return { ...save, ...completion };
}

function useOptionsCommand({
  draftRef,
  refresh,
  startWrite,
  clearMailSecret,
  resetMailValidation
}: CommandDependencies) {
  const admission = useCommandAdmission();
  const [saveFailureKey, setFailure] = useState<string | null>(null);
  const save = useCallback(async () => {
    if (!admission.begin()) return;
    const write = startWrite();
    setFailure(null);
    try {
      await saveSetupOptions(createOptionalOptionsRequest(draftRef.current), write.signal);
      if (write.signal.aborted) {
        admission.abort();
        return;
      }
      clearMailSecret();
      resetMailValidation();
      await refresh(write.signal);
      if (write.signal.aborted) {
        admission.abort();
        return;
      }
      admission.finish(false);
    } catch (error) {
      if (write.signal.aborted) {
        admission.abort();
        return;
      }
      const uncertain = setupWriteOutcome(error) === 'uncertain';
      if (uncertain) {
        clearMailSecret();
        resetMailValidation();
      }
      const result = await refresh(write.signal);
      if (write.signal.aborted) {
        admission.abort();
        return;
      }
      const retryable = !uncertain && result.succeeded && result.status.phase === 'optional_configuration';
      setFailure(retryable ? 'setup.optional.saveRejected' : 'setup.optional.saveUncertain');
      admission.finish(!retryable);
    } finally {
      write.release();
    }
  }, [admission, clearMailSecret, draftRef, refresh, resetMailValidation, startWrite]);
  return { save, saveFailureKey, savePending: admission.pending };
}

function useCompletionCommand(dependencies: CommandDependencies) {
  const { status, refresh, startWrite, clearMailSecret, resetMailValidation, onCompleted } = dependencies;
  const admission = useCommandAdmission();
  const [completeFailureKey, setFailure] = useState<string | null>(null);
  const acknowledgements = useWarningAcknowledgements();
  const { acknowledgedWarnings } = acknowledgements;
  const complete = useCallback(async () => {
    const warnings = status.pendingWarnings;
    if (!warnings.every(warning => acknowledgedWarnings.includes(warning)) || !admission.begin()) return;
    const write = startWrite();
    setFailure(null);
    try {
      const response = await completeSetup(
        { expectedPhase: 'optional_configuration', acknowledgedWarnings: [...warnings] },
        write.signal
      );
      if (write.signal.aborted) {
        admission.abort();
        return;
      }
      clearMailSecret();
      admission.finish(true);
      onCompleted(response);
    } catch (error) {
      if (write.signal.aborted) {
        admission.abort();
        return;
      }
      const uncertain = setupWriteOutcome(error) === 'uncertain';
      if (uncertain) {
        clearMailSecret();
        resetMailValidation();
      }
      const result = await refresh(write.signal);
      if (write.signal.aborted) {
        admission.abort();
        return;
      }
      const retryable = !uncertain && result.succeeded && result.status.phase === 'optional_configuration';
      setFailure(retryable ? 'setup.optional.complete.rejected' : 'setup.optional.complete.uncertain');
      admission.finish(!retryable);
    } finally {
      write.release();
    }
  }, [
    acknowledgedWarnings,
    admission,
    clearMailSecret,
    onCompleted,
    refresh,
    resetMailValidation,
    startWrite,
    status.pendingWarnings
  ]);
  return completionCommandResult(acknowledgements, complete, completeFailureKey, admission.pending);
}

function completionCommandResult(
  acknowledgements: ReturnType<typeof useWarningAcknowledgements>,
  complete: () => Promise<void>,
  completeFailureKey: string | null,
  completePending: boolean
) {
  return {
    acknowledgedWarnings: acknowledgements.acknowledgedWarnings,
    complete,
    completeFailureKey,
    completePending,
    setWarningAcknowledged: acknowledgements.setWarningAcknowledged
  };
}

function useWarningAcknowledgements() {
  const [acknowledgedWarnings, setAcknowledgedWarnings] = useState<SetupWarningCode[]>([]);
  const setWarningAcknowledged = useCallback((warning: SetupWarningCode, acknowledged: boolean) => {
    setAcknowledgedWarnings(current =>
      acknowledged ? [...new Set([...current, warning])] : current.filter(item => item !== warning)
    );
  }, []);
  return { acknowledgedWarnings, setWarningAcknowledged };
}

function useCommandAdmission() {
  const pendingRef = useRef(false);
  const blockedRef = useRef(false);
  const [pending, setPending] = useState(false);
  const begin = useCallback(() => {
    if (pendingRef.current || blockedRef.current) return false;
    pendingRef.current = true;
    setPending(true);
    return true;
  }, []);
  const finish = useCallback((blocked: boolean) => {
    blockedRef.current = blocked;
    pendingRef.current = false;
    setPending(false);
  }, []);
  const abort = useCallback(() => {
    blockedRef.current = true;
    pendingRef.current = false;
  }, []);
  return { abort, begin, finish, pending };
}
