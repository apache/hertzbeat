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
  const publicOrigin = window.location.origin;
  const draft = useSetupOptionalDraft();
  const validation = useSetupOptionalValidation(draft.draftRef, startWrite, draft.clearMailSecret, publicOrigin);
  const updateDraft = useCallback(
    (patch: Partial<SetupOptionalDraft>) => {
      draft.updateDraft(patch);
      if (patch.mail) validation.reset('mail');
      if ('useProxy' in patch || 'proxyPublicBaseUrl' in patch) {
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
    publicOrigin,
    onCompleted
  });
  return {
    ...commands,
    draft: draft.draft,
    publicOrigin,
    updateDraft,
    validation: validation.validation,
    validateMail: validation.validateMail,
    validatePublicAccess: validation.validatePublicAccess,
    pendingWarnings: status.pendingWarnings
  };
}
