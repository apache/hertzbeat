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

import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { type SetupConfigurationDraft, type SetupValidationSection } from '../model/setup-configuration';

export function useSetupConfigurationDraftState(initialDraft: () => SetupConfigurationDraft) {
  const [draft, setDraftState] = useState(initialDraft);
  const draftRef = useRef(draft);
  const setDraft: Dispatch<SetStateAction<SetupConfigurationDraft>> = useCallback(update => {
    const nextDraft = typeof update === 'function' ? update(draftRef.current) : update;
    draftRef.current = nextDraft;
    setDraftState(nextDraft);
  }, []);
  return { draft, draftRef, setDraft };
}

export function useSetupConfigurationDraftUpdates(
  draftRef: { current: SetupConfigurationDraft },
  setDraft: Dispatch<SetStateAction<SetupConfigurationDraft>>,
  resetSection: (section: SetupValidationSection) => void
) {
  const updateManagement = useCallback(
    (value: Partial<SetupConfigurationDraft['managementDatabase']>) => {
      setDraft({
        ...draftRef.current,
        managementDatabase: { ...draftRef.current.managementDatabase, ...value }
      });
      resetSection('metadata_database');
    },
    [draftRef, resetSection, setDraft]
  );
  const updateTelemetry = useCallback(
    (value: Partial<SetupConfigurationDraft['telemetryStore']>) => {
      setDraft({ ...draftRef.current, telemetryStore: { ...draftRef.current.telemetryStore, ...value } });
      resetSection('telemetry_store');
    },
    [draftRef, resetSection, setDraft]
  );
  return { updateManagement, updateTelemetry };
}
