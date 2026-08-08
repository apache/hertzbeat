/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useRef, useState } from 'react';

import { createSetupAdministrator } from '../api/setup-api';
import { administratorFormComplete, createAdministratorRequest } from '../model/setup-administrator';
import type { SetupRequestFailure } from '../model/setup-configuration-state';
import { classifySetupRequestFailure } from './setup-request-failure';
import { useSetupWriteBoundary } from './use-setup-write-boundary';

export function useSetupAdministratorController(refetchStatus: () => Promise<unknown> | void) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<SetupRequestFailure | null>(null);
  const submitPending = useRef(false);
  const startWrite = useSetupWriteBoundary();
  const canSubmit = administratorFormComplete({ username, password, confirmPassword }) && !submitting;
  const confirmationMismatch = Boolean(confirmPassword) && password !== confirmPassword;
  const submit = useCallback(async () => {
    if (submitPending.current || !administratorFormComplete({ username, password, confirmPassword })) return;
    const write = startWrite();
    submitPending.current = true;
    setSubmitting(true);
    setFailure(null);
    let administratorCreated = false;
    try {
      await createSetupAdministrator(createAdministratorRequest(username, password), write.signal);
      if (!write.signal.aborted) {
        administratorCreated = true;
        setPassword('');
        setConfirmPassword('');
        await refetchStatus();
      }
    } catch (error) {
      // A later status refetch failure must not be reported as an administrator creation failure.
      if (!write.signal.aborted && !administratorCreated) setFailure(classifySetupRequestFailure(error));
    } finally {
      write.release();
      submitPending.current = false;
      if (!write.signal.aborted) setSubmitting(false);
    }
  }, [confirmPassword, password, refetchStatus, startWrite, username]);

  return {
    username,
    password,
    confirmPassword,
    setUsername,
    setPassword,
    setConfirmPassword,
    canSubmit,
    confirmationMismatch,
    submitting,
    failure,
    submit
  };
}
