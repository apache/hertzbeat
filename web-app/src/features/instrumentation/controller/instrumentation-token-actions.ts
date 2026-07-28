/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react';

import { generateAccessToken } from '@/shared/access-token/access-token-generation-api';
import {
  createAccessTokenGenerationDraft,
  validateAccessTokenGenerationDraft,
  type AccessTokenGenerationDraft
} from '@/shared/access-token/access-token-generation-model';

import type { InstrumentationControllerState } from './instrumentation-controller-state';

export function useInstrumentationTokenActions(
  state: InstrumentationControllerState,
  generationRef: RefObject<number>,
  canGenerateToken: boolean
) {
  const tokenGenerationRef = useRef(0);
  const canGenerateTokenRef = useRef(canGenerateToken);
  useLayoutEffect(() => {
    canGenerateTokenRef.current = canGenerateToken;
  }, [canGenerateToken]);
  useRetireTokenGeneration(canGenerateToken, state, tokenGenerationRef);
  const openTokenGenerator = useCallback(() => {
    if (!canGenerateTokenRef.current || state.tokenGenerating) return;
    state.setTokenError(false);
    state.setTokenDraft({ ...createAccessTokenGenerationDraft('otlp-ingest'), scope: 'otlp-ingest' });
  }, [canGenerateTokenRef, state]);
  const closeTokenGenerator = useCallback(() => {
    if (!state.tokenGenerating) state.setTokenDraft(undefined);
  }, [state]);
  const updateTokenDraft = useCallback(
    (draft: AccessTokenGenerationDraft) => {
      if (canGenerateTokenRef.current && !state.tokenGenerating) {
        state.setTokenDraft({ ...draft, scope: 'otlp-ingest' });
      }
    },
    [canGenerateTokenRef, state]
  );
  const generateToken = useCallback(async () => {
    if (!canGenerateTokenRef.current) return;
    const draft = state.tokenDraft;
    if (!draft || validateAccessTokenGenerationDraft(draft).length > 0) {
      state.setTokenError(true);
      return;
    }
    const flowGeneration = generationRef.current;
    const tokenGeneration = tokenGenerationRef.current;
    state.setTokenGenerating(true);
    state.setTokenError(false);
    try {
      const receipt = await generateAccessToken({ ...draft, scope: 'otlp-ingest' });
      if (!generationIsCurrent(generationRef, flowGeneration, tokenGenerationRef, tokenGeneration)) return;
      state.setToken(receipt.token);
      state.setTokenDraft(undefined);
    } catch {
      if (generationIsCurrent(generationRef, flowGeneration, tokenGenerationRef, tokenGeneration)) {
        state.setTokenError(true);
      }
    } finally {
      if (generationIsCurrent(generationRef, flowGeneration, tokenGenerationRef, tokenGeneration)) {
        state.setTokenGenerating(false);
      }
    }
  }, [canGenerateTokenRef, generationRef, state, tokenGenerationRef]);
  return { openTokenGenerator, closeTokenGenerator, updateTokenDraft, generateToken };
}

function useRetireTokenGeneration(
  canGenerateToken: boolean,
  state: InstrumentationControllerState,
  tokenGenerationRef: RefObject<number>
) {
  const previousCanGenerate = useRef(canGenerateToken);
  useLayoutEffect(() => {
    const lostCapability = previousCanGenerate.current && !canGenerateToken;
    previousCanGenerate.current = canGenerateToken;
    if (!lostCapability) return;
    tokenGenerationRef.current += 1;
    state.setTokenDraft(undefined);
    state.setTokenGenerating(false);
    state.setTokenError(false);
  }, [canGenerateToken, state, tokenGenerationRef]);
}

function generationIsCurrent(
  flowGenerationRef: RefObject<number>,
  flowGeneration: number,
  tokenGenerationRef: RefObject<number>,
  tokenGeneration: number
) {
  return flowGenerationRef.current === flowGeneration && tokenGenerationRef.current === tokenGeneration;
}
