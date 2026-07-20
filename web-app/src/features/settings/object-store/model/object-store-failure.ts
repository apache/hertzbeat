/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export type ObjectStoreFailureKind = 'invalid' | 'unavailable' | 'error';
export type ObjectStoreWriteOutcome = 'rejected' | 'uncertain';

type ObjectStoreFailureOptions = { code?: string };

/** Redacted failure evidence shared by Object Store API, provider, and controllers. */
export class ObjectStoreRequestFailure extends Error {
  readonly kind: ObjectStoreFailureKind;
  readonly writeOutcome: ObjectStoreWriteOutcome;
  readonly code: string | undefined;

  constructor(
    kind: ObjectStoreFailureKind,
    writeOutcome: ObjectStoreWriteOutcome,
    options: ObjectStoreFailureOptions = {}
  ) {
    super('Object Store request failed');
    this.name = 'ObjectStoreRequestFailure';
    this.kind = kind;
    this.writeOutcome = writeOutcome;
    this.code = options.code;
  }
}

export function classifyObjectStoreReadFailure(reason: unknown): ObjectStoreFailureKind {
  return reason instanceof ObjectStoreRequestFailure ? reason.kind : 'error';
}

/** Only explicit domain rejection evidence permits a deliberate write retry. */
export function isObjectStoreWriteRejection(reason: unknown) {
  return reason instanceof ObjectStoreRequestFailure && reason.writeOutcome === 'rejected';
}
