/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useRef, useState } from 'react';

import { clearOptionalMailSecret, createOptionalDraft, type SetupOptionalDraft } from '../model/setup-optional';

export function useSetupOptionalDraft() {
  const [draft, setDraft] = useState(createOptionalDraft);
  const draftRef = useRef(draft);
  const updateDraft = useCallback((patch: Partial<SetupOptionalDraft>) => {
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    setDraft(next);
  }, []);
  const clearMailSecret = useCallback(() => {
    const next = clearOptionalMailSecret(draftRef.current);
    draftRef.current = next;
    setDraft(next);
  }, []);
  return { clearMailSecret, draft, draftRef, updateDraft };
}
