/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useState } from 'react';

import { createSetupAdministrator } from '../api/setup-api';
import { administratorFormComplete, createAdministratorRequest } from '../model/setup-administrator';
import type { SetupStatus } from '../model/setup-contract';
import type { SetupRequestFailure } from '../model/setup-configuration-state';
import { classifySetupRequestFailure } from './setup-request-failure';
import { safeSetupStatusRefresh, type SetupStatusRefresh } from './setup-status-refresh';
import { administratorRetryAllowed, setupWriteAuthority } from './setup-write-authority';
import { useSetupStatusAuthorityConvergence } from './use-setup-status-authority-convergence';
import { useSetupWriteBoundary } from './use-setup-write-boundary';
import { useSetupWriteAdmission } from './use-setup-write-admission';

export function useSetupAdministratorController(status: SetupStatus, refetchStatus: SetupStatusRefresh) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const credentials = { username, password, confirmPassword };
  const clearSecrets = useCallback(() => {
    setPassword('');
    setConfirmPassword('');
  }, []);
  const submission = useAdministratorSubmission(credentials, status, refetchStatus, clearSecrets);
  const canSubmit =
    administratorFormComplete(credentials) &&
    administratorRetryAllowed(status) &&
    !submission.submitting &&
    !submission.closed;
  const confirmationMismatch = Boolean(confirmPassword) && password !== confirmPassword;

  return {
    username,
    password,
    confirmPassword,
    setUsername,
    setPassword,
    setConfirmPassword,
    canSubmit,
    confirmationMismatch,
    submitting: submission.submitting,
    failure: submission.failure,
    submit: submission.submit
  };
}

function useAdministratorSubmission(
  credentials: AdministratorCredentials,
  status: SetupStatus,
  refetchStatus: SetupStatusRefresh,
  clearSecrets: () => void
) {
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<SetupRequestFailure | null>(null);
  const [awaitingCreatedStatus, setAwaitingCreatedStatus] = useState(false);
  const { closed, reconcile, tryClose } = useSetupWriteAdmission();
  const startWrite = useSetupWriteBoundary();
  useSetupStatusAuthorityConvergence(awaitingCreatedStatus, refetchStatus, administratorCreationConverged);

  const submit = useCallback(async () => {
    if (!administratorFormComplete(credentials) || !administratorRetryAllowed(status) || !tryClose()) return;
    const write = startWrite();
    setSubmitting(true);
    setFailure(null);
    try {
      await createSetupAdministrator(
        createAdministratorRequest(credentials.username, credentials.password),
        write.signal
      );
      if (!write.signal.aborted) {
        clearSecrets();
        setAwaitingCreatedStatus(true);
      }
    } catch (error) {
      if (!write.signal.aborted) {
        setFailure(classifySetupRequestFailure(error));
        const authority = setupWriteAuthority(error, 'administrator');
        if (authority !== 'current') {
          clearSecrets();
          const refresh = await safeSetupStatusRefresh(refetchStatus);
          reconcile(authority, refresh.succeeded && administratorRetryAllowed(refresh.status));
        } else {
          reconcile(authority);
        }
      }
    } finally {
      write.release();
      if (!write.signal.aborted) setSubmitting(false);
    }
  }, [clearSecrets, credentials, reconcile, refetchStatus, startWrite, status, tryClose]);

  return { closed, submitting, failure, submit };
}

type AdministratorCredentials = {
  username: string;
  password: string;
  confirmPassword: string;
};

function administratorCreationConverged(status: SetupStatus) {
  return status.administratorConfigured || status.phase !== 'administrator_required';
}
