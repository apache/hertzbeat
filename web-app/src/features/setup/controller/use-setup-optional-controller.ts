/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback } from 'react';

import type { SetupStatus } from '../model/setup-contract';
import type { SetupCompleteResponse, SetupOptionalDraft } from '../model/setup-optional';
import type { SetupStatusRefresh } from './setup-status-refresh';
import { useSetupOptionalCommands } from './use-setup-optional-commands';
import { useSetupOptionalDraft } from './use-setup-optional-draft';
import { useSetupOptionalValidation } from './use-setup-optional-validation';
import { useSetupWriteBoundary } from './use-setup-write-boundary';

export function useSetupOptionalController(
  status: SetupStatus,
  refresh: SetupStatusRefresh,
  onCompleted: (response: SetupCompleteResponse) => void
) {
  const startWrite = useSetupWriteBoundary();
  const draft = useSetupOptionalDraft();
  const validation = useSetupOptionalValidation(draft.draftRef, startWrite, draft.clearMailSecret);
  const updateDraft = useCallback(
    (patch: Partial<SetupOptionalDraft>) => {
      draft.updateDraft(patch);
      if (patch.mail) validation.reset('mail');
      if ('publicBaseUrl' in patch || 'serverOtlpHttpEndpoint' in patch || 'serverOtlpGrpcEndpoint' in patch) {
        validation.reset('public_access');
      }
    },
    [draft, validation]
  );
  const commands = useSetupOptionalCommands({
    status,
    draftRef: draft.draftRef,
    refresh,
    startWrite,
    clearMailSecret: draft.clearMailSecret,
    resetMailValidation: () => validation.reset('mail'),
    onCompleted
  });
  return {
    ...commands,
    draft: draft.draft,
    updateDraft,
    validation: validation.validation,
    validateMail: validation.validateMail,
    validatePublicAccess: validation.validatePublicAccess,
    pendingWarnings: status.pendingWarnings
  };
}
