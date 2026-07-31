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
  canGenerateToken: boolean,
  requiresToken: boolean
) {
  const tokenGenerationRef = useRef(0);
  const tokenCommandsEnabled = canGenerateToken && requiresToken;
  const tokenCommandsEnabledRef = useRef(tokenCommandsEnabled);
  const requiresTokenRef = useRef(requiresToken);
  useLayoutEffect(() => {
    tokenCommandsEnabledRef.current = tokenCommandsEnabled;
    requiresTokenRef.current = requiresToken;
  }, [requiresToken, tokenCommandsEnabled]);
  useRetireTokenGeneration(tokenCommandsEnabled, requiresToken, state, tokenGenerationRef);
  const setToken = useTokenSetter(state, generationRef, requiresTokenRef);
  const openTokenGenerator = useCallback(() => {
    if (!tokenCommandsEnabledRef.current || state.tokenGenerating) return;
    state.setTokenError(false);
    state.setTokenDraft({ ...createAccessTokenGenerationDraft('otlp-ingest'), scope: 'otlp-ingest' });
  }, [state, tokenCommandsEnabledRef]);
  const closeTokenGenerator = useCallback(() => {
    if (!state.tokenGenerating) state.setTokenDraft(undefined);
  }, [state]);
  const updateTokenDraft = useCallback(
    (draft: AccessTokenGenerationDraft) => {
      if (tokenCommandsEnabledRef.current && !state.tokenGenerating) {
        state.setTokenDraft({ ...draft, scope: 'otlp-ingest' });
      }
    },
    [state, tokenCommandsEnabledRef]
  );
  const generateToken = useCallback(async () => {
    if (!tokenCommandsEnabledRef.current) return;
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
  }, [generationRef, state, tokenCommandsEnabledRef, tokenGenerationRef]);
  return { setToken, openTokenGenerator, closeTokenGenerator, updateTokenDraft, generateToken };
}

function useTokenSetter(
  state: InstrumentationControllerState,
  generationRef: RefObject<number>,
  requiresTokenRef: RefObject<boolean>
) {
  const flowGeneration = generationRef.current;
  return useCallback(
    (token: string) => {
      // A retained callback must not repopulate secret state after its flow
      // scope retires or the destination stops requiring Bearer auth.
      if (requiresTokenRef.current && generationRef.current === flowGeneration) state.setToken(token);
    },
    [flowGeneration, generationRef, requiresTokenRef, state]
  );
}

function useRetireTokenGeneration(
  tokenCommandsEnabled: boolean,
  requiresToken: boolean,
  state: InstrumentationControllerState,
  tokenGenerationRef: RefObject<number>
) {
  const previousCommandsEnabled = useRef(tokenCommandsEnabled);
  const previousRequiresToken = useRef(requiresToken);
  useLayoutEffect(() => {
    const tokenRetired = previousRequiresToken.current && !requiresToken;
    const generationRetired = previousCommandsEnabled.current && !tokenCommandsEnabled;
    previousRequiresToken.current = requiresToken;
    previousCommandsEnabled.current = tokenCommandsEnabled;
    if (!tokenRetired && !generationRetired) return;
    tokenGenerationRef.current += 1;
    if (tokenRetired) state.setToken('');
    state.setTokenDraft(undefined);
    state.setTokenGenerating(false);
    state.setTokenError(false);
  }, [requiresToken, state, tokenCommandsEnabled, tokenGenerationRef]);
}

function generationIsCurrent(
  flowGenerationRef: RefObject<number>,
  flowGeneration: number,
  tokenGenerationRef: RefObject<number>,
  tokenGeneration: number
) {
  return flowGenerationRef.current === flowGeneration && tokenGenerationRef.current === tokenGeneration;
}
