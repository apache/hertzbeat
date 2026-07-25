/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useCallback, type RefObject } from 'react';

import { generateAccessToken } from '@/shared/access-token/access-token-generation-api';
import {
  createAccessTokenGenerationDraft,
  validateAccessTokenGenerationDraft,
  type AccessTokenGenerationDraft
} from '@/shared/access-token/access-token-generation-model';

import type { InstrumentationControllerState } from './instrumentation-controller-state';

export function useInstrumentationTokenActions(
  state: InstrumentationControllerState,
  generationRef: RefObject<number>
) {
  const openTokenGenerator = useCallback(() => {
    if (state.tokenGenerating) return;
    state.setTokenError(false);
    state.setTokenDraft({ ...createAccessTokenGenerationDraft('otlp-ingest'), scope: 'otlp-ingest' });
  }, [state]);
  const closeTokenGenerator = useCallback(() => {
    if (!state.tokenGenerating) state.setTokenDraft(undefined);
  }, [state]);
  const updateTokenDraft = useCallback(
    (draft: AccessTokenGenerationDraft) => {
      if (!state.tokenGenerating) state.setTokenDraft({ ...draft, scope: 'otlp-ingest' });
    },
    [state]
  );
  const generateToken = useCallback(async () => {
    const draft = state.tokenDraft;
    if (!draft || validateAccessTokenGenerationDraft(draft).length > 0) {
      state.setTokenError(true);
      return;
    }
    const generation = generationRef.current;
    state.setTokenGenerating(true);
    state.setTokenError(false);
    try {
      const receipt = await generateAccessToken({ ...draft, scope: 'otlp-ingest' });
      if (generationRef.current !== generation) return;
      state.setToken(receipt.token);
      state.setTokenDraft(undefined);
    } catch {
      if (generationRef.current === generation) state.setTokenError(true);
    } finally {
      if (generationRef.current === generation) state.setTokenGenerating(false);
    }
  }, [generationRef, state]);
  return { openTokenGenerator, closeTokenGenerator, updateTokenDraft, generateToken };
}
