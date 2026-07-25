/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export type AccessTokenScope = 'api-admin' | 'otlp-ingest' | 'readonly-query';

export type AccessTokenGenerationDraft = {
  name: string;
  expireSeconds: number;
  scope: AccessTokenScope;
};

export type GeneratedAccessTokenReceipt = {
  id: 'generated';
  token: string;
};

export const accessTokenScopeDefinitions = [
  { value: 'api-admin', labelKey: 'token.scope.apiAdmin' },
  { value: 'otlp-ingest', labelKey: 'token.scope.otlpIngest' },
  { value: 'readonly-query', labelKey: 'token.scope.readonlyQuery' }
] as const satisfies readonly { value: AccessTokenScope; labelKey: string }[];

export const accessTokenExpirationDefinitions = [
  { value: -1, labelKey: 'token.expiration.never' },
  { value: 604_800, labelKey: 'token.expiration.days7' },
  { value: 2_592_000, labelKey: 'token.expiration.days30' },
  { value: 7_776_000, labelKey: 'token.expiration.days90' },
  { value: 15_552_000, labelKey: 'token.expiration.days180' },
  { value: 31_536_000, labelKey: 'token.expiration.days365' }
] as const;

export function isAccessTokenScope(value: unknown): value is AccessTokenScope {
  return accessTokenScopeDefinitions.some(definition => definition.value === value);
}

export function createAccessTokenGenerationDraft(scope?: string | null): AccessTokenGenerationDraft {
  return { name: '', expireSeconds: -1, scope: normalizeScope(scope) };
}

export function validateAccessTokenGenerationDraft(draft: AccessTokenGenerationDraft) {
  return draft.name.trim() ? [] : ['name'];
}

function normalizeScope(scope?: string | null): AccessTokenScope {
  const normalized = scope?.trim().toLowerCase();
  return isAccessTokenScope(normalized) ? normalized : 'api-admin';
}
