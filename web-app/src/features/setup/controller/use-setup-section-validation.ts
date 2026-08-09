/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useRef, useState } from 'react';

import { validateSetupSection } from '../api/setup-api';
import {
  createValidationRequest,
  type SetupConfigurationDraft,
  type SetupValidationSection
} from '../model/setup-configuration';
import type { SetupSectionValidation, SetupSectionValidationMap } from '../model/setup-configuration-state';
import { classifySetupRequestFailure } from './setup-request-failure';
import type { SetupWriteBoundary } from './use-setup-write-boundary';

const initialValidation: SetupSectionValidationMap = {
  metadata_database: { state: 'idle' },
  telemetry_store: { state: 'idle' }
};

export function useSetupSectionValidation(
  draftRef: { current: SetupConfigurationDraft },
  startWrite: SetupWriteBoundary
) {
  const [validation, setValidation] = useState<SetupSectionValidationMap>(initialValidation);
  const generations = useRef<Record<SetupValidationSection, number>>({
    metadata_database: 0,
    telemetry_store: 0
  });
  const validating = useRef<Partial<Record<SetupValidationSection, number>>>({});
  const resetSection = useCallback((section: SetupValidationSection) => {
    generations.current[section] += 1;
    delete validating.current[section];
    setValidation(current => ({ ...current, [section]: { state: 'idle' } }));
  }, []);
  const resetValidation = useCallback(() => {
    generations.current.metadata_database += 1;
    generations.current.telemetry_store += 1;
    validating.current = {};
    setValidation(initialValidation);
  }, []);
  const validateSection = useCallback(
    async (section: SetupValidationSection) => {
      const generation = generations.current[section];
      if (validating.current[section] === generation) return;
      const write = startWrite();
      validating.current[section] = generation;
      setValidation(current => ({ ...current, [section]: { state: 'checking' } }));
      try {
        const result = await validateSetupSection(createValidationRequest(section, draftRef.current), write.signal);
        if (!write.signal.aborted && generations.current[section] === generation) {
          setValidation(current => ({ ...current, [section]: { state: 'complete', ...result } }));
        }
      } catch (error) {
        if (!write.signal.aborted && generations.current[section] === generation) {
          setValidation(current => ({ ...current, [section]: validationFailure(error) }));
        }
      } finally {
        write.release();
        if (validating.current[section] === generation) delete validating.current[section];
      }
    },
    [draftRef, startWrite]
  );
  return { validation, resetSection, resetValidation, validateSection };
}

function validationFailure(error: unknown): SetupSectionValidation {
  return { state: 'failed', ...classifySetupRequestFailure(error) };
}
