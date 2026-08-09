/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useRef, useState } from 'react';

import { validateSetupSection } from '../api/setup-api';
import {
  createOptionalValidationRequest,
  type SetupOptionalDraft,
  type SetupOptionalValidationEvidence,
  type SetupOptionalValidationRequest
} from '../model/setup-optional';
import { classifySetupRequestFailure } from './setup-request-failure';
import type { SetupWriteBoundary } from './use-setup-write-boundary';

type Section = SetupOptionalValidationRequest['section'];
type ValidationMap = { publicAccess: SetupOptionalValidationEvidence; mail: SetupOptionalValidationEvidence };
const initialValidation: ValidationMap = { publicAccess: null, mail: null };

export function useSetupOptionalValidation(
  draftRef: { current: SetupOptionalDraft },
  startWrite: SetupWriteBoundary,
  clearMailSecret: () => void
) {
  const [validation, setValidation] = useState<ValidationMap>(initialValidation);
  const generations = useRef<Record<Section, number>>({ public_access: 0, mail: 0 });
  const validating = useRef<Partial<Record<Section, number>>>({});
  const reset = useCallback((section: Section) => {
    generations.current[section] += 1;
    delete validating.current[section];
    const key = sectionKey(section);
    setValidation(current => ({ ...current, [key]: null }));
  }, []);
  const validate = useCallback(
    async (section: Section) => {
      const generation = generations.current[section];
      if (validating.current[section] === generation) return;
      const write = startWrite();
      const key = sectionKey(section);
      validating.current[section] = generation;
      setValidation(current => ({ ...current, [key]: { state: 'checking' } }));
      try {
        const result = await validateSetupSection(
          createOptionalValidationRequest(section, draftRef.current),
          write.signal
        );
        if (!write.signal.aborted && generations.current[section] === generation) {
          const { valid, errorCode, warnings } = result;
          setValidation(current => ({ ...current, [key]: { state: 'complete', valid, errorCode, warnings } }));
        }
      } catch (error) {
        if (!write.signal.aborted && generations.current[section] === generation) {
          if (section === 'mail') clearMailSecret();
          setValidation(current => ({ ...current, [key]: { state: 'failed', ...classifySetupRequestFailure(error) } }));
        }
      } finally {
        write.release();
        if (validating.current[section] === generation) delete validating.current[section];
      }
    },
    [clearMailSecret, draftRef, startWrite]
  );
  return {
    reset,
    validation,
    validateMail: () => validate('mail'),
    validatePublicAccess: () => validate('public_access')
  };
}

function sectionKey(section: Section): keyof ValidationMap {
  return section === 'public_access' ? 'publicAccess' : 'mail';
}
