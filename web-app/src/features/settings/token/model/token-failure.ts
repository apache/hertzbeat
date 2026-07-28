/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export type TokenFailureKind = 'invalid' | 'unavailable' | 'permission' | 'error';
export type TokenWriteOutcome = 'rejected' | 'uncertain';

type TokenFailureOptions = { code?: string };

/** Redacted failure evidence shared by the Token API, provider, and controllers. */
export class TokenRequestFailure extends Error {
  readonly kind: TokenFailureKind;
  readonly writeOutcome: TokenWriteOutcome;
  readonly code: string | undefined;

  constructor(kind: TokenFailureKind, writeOutcome: TokenWriteOutcome, options: TokenFailureOptions = {}) {
    super('Token request failed');
    this.name = 'TokenRequestFailure';
    this.kind = kind;
    this.writeOutcome = writeOutcome;
    this.code = options.code;
  }
}

export function classifyTokenCollectionFailure(reason: unknown): TokenFailureKind {
  return reason instanceof TokenRequestFailure ? reason.kind : 'error';
}

/** Only explicit domain rejection evidence permits a deliberate write retry. */
export function isTokenWriteRejection(reason: unknown) {
  return reason instanceof TokenRequestFailure && reason.writeOutcome === 'rejected';
}
