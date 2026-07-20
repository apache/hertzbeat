/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  labelExpectedIdentity,
  labelRecordIdentity,
  labelSaveConverged,
  type LabelExpectedWrite,
  type LabelIdentity,
  type LabelRecord
} from './label-model';

export type LabelFailureKind = 'invalid' | 'unavailable' | 'error';
export type LabelWriteOutcome = 'not-attempted' | 'rejected' | 'uncertain';
export type LabelWriteRecovery = 'rewrite' | 'proof' | 'commit-uncertain';

export type LabelWriteEvidence = {
  operation: 'create' | 'update';
  phase: 'write' | 'proof';
  recovery: LabelWriteRecovery;
  identity: LabelIdentity;
  expected: LabelExpectedWrite;
};

export type LabelDeleteEvidence = {
  operation: 'delete';
  phase: 'preflight' | 'write' | 'proof';
  recovery: 'rewrite' | 'proof';
  identity: LabelIdentity;
};

export type LabelMutationEvidence = LabelWriteEvidence | LabelDeleteEvidence;

type LabelFailureOptions = {
  code?: string;
  evidence?: LabelMutationEvidence;
};

/** Redacted domain evidence consumed by controllers instead of HTTP status inspection. */
export class LabelRequestFailure extends Error {
  readonly kind: LabelFailureKind;
  readonly writeOutcome: LabelWriteOutcome;
  readonly code: string | undefined;
  readonly evidence: LabelMutationEvidence | undefined;

  constructor(kind: LabelFailureKind, writeOutcome: LabelWriteOutcome, options: LabelFailureOptions = {}) {
    super('Label request failed');
    this.name = 'LabelRequestFailure';
    this.kind = kind;
    this.writeOutcome = writeOutcome;
    this.code = options.code;
    this.evidence = options.evidence;
  }
}

export function classifyLabelReadFailure(reason: unknown): Exclude<LabelFailureKind, 'invalid'> | 'error' {
  return reason instanceof LabelRequestFailure && reason.kind === 'unavailable' ? 'unavailable' : 'error';
}

export function isSafeLabelMutationRelease(reason: unknown) {
  if (!(reason instanceof LabelRequestFailure)) return false;
  if (reason.writeOutcome === 'not-attempted') return true;
  return (
    reason.writeOutcome === 'rejected' && reason.evidence?.phase === 'write' && reason.evidence.recovery === 'rewrite'
  );
}

export function createLabelWriteEvidence(
  operation: LabelWriteEvidence['operation'],
  phase: LabelWriteEvidence['phase'],
  recovery: LabelWriteRecovery,
  expected: LabelExpectedWrite
): LabelWriteEvidence {
  return { operation, phase, recovery, identity: labelExpectedIdentity(expected), expected };
}

export function createLabelDeleteEvidence(
  phase: LabelDeleteEvidence['phase'],
  recovery: LabelDeleteEvidence['recovery'],
  record: LabelRecord
): LabelDeleteEvidence {
  return { operation: 'delete', phase, recovery, identity: labelRecordIdentity(record) };
}

export function enrichCreateEvidence(evidence: LabelWriteEvidence, canonical: LabelRecord): LabelWriteEvidence {
  if (evidence.operation !== 'create') return evidence;
  return {
    ...evidence,
    identity: { ...evidence.identity, id: canonical.id },
    expected: { ...evidence.expected, id: canonical.id }
  };
}

/** Checks the visible Refine projection without assuming the target belongs to the current page/filter. */
export function labelProjectionConverged(evidence: LabelMutationEvidence, records: LabelRecord[], total: number) {
  if (!Number.isSafeInteger(total) || total < 0 || records.length > total) return false;
  const targetId = evidence.identity.id;
  if (targetId === undefined) return false;
  const matches = records.filter(record => record.id === targetId);
  if (matches.length > 1) return false;
  if (evidence.operation === 'delete') return matches.length === 0;
  const match = matches[0];
  if (!match) return evidence.operation === 'update';
  return labelSaveConverged(evidence.expected, match);
}
