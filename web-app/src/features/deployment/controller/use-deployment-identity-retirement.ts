/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, type Dispatch, type SetStateAction } from 'react';

import type { DeploymentDraft } from '../model/deployment-workflow';
import { clearDeploymentTargetIdentity } from '../model/deployment-workflow';

export function useDeploymentIdentityRetirement(
  operationId: string | null,
  setDraft: Dispatch<SetStateAction<DeploymentDraft>>,
  setAcknowledged: (value: boolean) => void,
  setExportPassword: (value: string) => void,
  resetValidation: () => void
) {
  useEffect(() => {
    setDraft(current => clearDeploymentTargetIdentity(current));
    setAcknowledged(false);
    setExportPassword('');
    resetValidation();
  }, [operationId, resetValidation, setAcknowledged, setDraft, setExportPassword]);
}
