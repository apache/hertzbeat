/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
