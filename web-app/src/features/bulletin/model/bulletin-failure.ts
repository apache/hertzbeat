/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export type BulletinFailureKind = 'missing' | 'invalid' | 'permission' | 'unavailable' | 'error';
export type BulletinWriteOutcome = 'rejected' | 'uncertain';

type BulletinFailureOptions = { code?: string };

/** Redacted failure evidence shared by Bulletin API and controllers. */
export class BulletinRequestFailure extends Error {
  readonly kind: BulletinFailureKind;
  readonly writeOutcome: BulletinWriteOutcome;
  readonly code: string | undefined;

  constructor(kind: BulletinFailureKind, writeOutcome: BulletinWriteOutcome, options: BulletinFailureOptions = {}) {
    super('Bulletin request failed');
    this.name = 'BulletinRequestFailure';
    this.kind = kind;
    this.writeOutcome = writeOutcome;
    this.code = options.code;
  }
}

export function classifyBulletinFailure(reason: unknown): BulletinFailureKind {
  return reason instanceof BulletinRequestFailure ? reason.kind : 'error';
}

/** Only a typed request rejection proves that a mutation may be deliberately submitted again. */
export function isBulletinWriteRejection(reason: unknown) {
  return reason instanceof BulletinRequestFailure && reason.writeOutcome === 'rejected';
}
