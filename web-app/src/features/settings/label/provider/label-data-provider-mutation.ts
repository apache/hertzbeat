/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { createRefineHttpError, isRefineHttpError } from '@/shared/refine/refine-http-error';

import { deleteLabel, findCanonicalLabel, saveLabel } from '../api/label-api';
import { isExplicitLabelTransportRejection, LabelTransportFailure } from '../api/label-api-failure';
import {
  createLabelDeleteEvidence,
  createLabelWriteEvidence,
  LabelRequestFailure,
  type LabelFailureKind,
  type LabelMutationEvidence,
  type LabelWriteEvidence,
  type LabelWriteOutcome
} from '../model/label-failure';
import {
  buildLabelExpectedWrite,
  labelSaveConverged,
  LabelContractError,
  type LabelIdentity,
  type LabelRecord
} from '../model/label-model';
import { toLabelIdentity } from './label-data-provider-input';

export async function writeAndProveLabel(
  operation: LabelWriteEvidence['operation'],
  draft: Partial<LabelRecord> & Pick<LabelRecord, 'name'>
) {
  const expected = buildLabelExpectedWrite(draft, operation);
  try {
    await saveLabel(draft, operation === 'create');
  } catch (reason) {
    throw mutationFailure(reason, writeEvidence(operation, 'write', expected, reason));
  }
  try {
    const canonical = await requireCanonicalLabel(toLabelIdentity(expected));
    if (!labelSaveConverged(expected, canonical)) {
      throw new LabelRequestFailure('invalid', 'uncertain', { code: 'LABEL_CANONICAL_NOT_CONVERGED' });
    }
    return canonical;
  } catch (reason) {
    throw mutationFailure(reason, writeEvidence(operation, 'proof', expected));
  }
}

export async function deleteAndProveLabel(id: number, draft: Partial<LabelRecord> & Pick<LabelRecord, 'name'>) {
  const identity = toLabelIdentity(draft, id);
  let canonical: LabelRecord;
  try {
    canonical = await requireCanonicalLabel(identity);
  } catch (reason) {
    const evidence = createLabelDeleteEvidence('preflight', 'rewrite', { ...draft, id });
    throw mutationFailure(reason, evidence, 'not-attempted');
  }
  try {
    await deleteLabel(id);
  } catch (reason) {
    throw mutationFailure(reason, createLabelDeleteEvidence('write', deleteRecovery(reason), canonical));
  }
  try {
    if (await findCanonicalLabel(identity)) {
      throw new LabelRequestFailure('invalid', 'uncertain', { code: 'LABEL_DELETE_NOT_CONFIRMED' });
    }
    return canonical;
  } catch (reason) {
    throw mutationFailure(reason, createLabelDeleteEvidence('proof', 'proof', canonical));
  }
}

export function toLabelRequestFailure(reason: LabelTransportFailure | LabelContractError) {
  if (reason instanceof LabelTransportFailure) {
    return new LabelRequestFailure(
      transportFailureKind(reason),
      isExplicitLabelTransportRejection(reason) ? 'rejected' : 'uncertain'
    );
  }
  return new LabelRequestFailure('invalid', 'uncertain', { code: reason.code });
}

async function requireCanonicalLabel(identity: LabelIdentity) {
  const canonical = await findCanonicalLabel(identity);
  if (!canonical) {
    throw createRefineHttpError(
      'Label canonical reread returned no matching server record',
      502,
      'LABEL_CANONICAL_REREAD_MISSING'
    );
  }
  return canonical;
}

function writeEvidence(
  operation: LabelWriteEvidence['operation'],
  phase: LabelWriteEvidence['phase'],
  expected: LabelWriteEvidence['expected'],
  reason?: unknown
) {
  const rejected = phase === 'write' && isExplicitLabelTransportRejection(reason);
  return createLabelWriteEvidence(operation, phase, writeRecovery(operation, rejected), expected);
}

function writeRecovery(operation: LabelWriteEvidence['operation'], rejected: boolean) {
  if (rejected) return 'rewrite';
  return operation === 'update' ? 'proof' : 'commit-uncertain';
}

function deleteRecovery(reason: unknown): 'rewrite' | 'proof' {
  return isExplicitLabelTransportRejection(reason) ? 'rewrite' : 'proof';
}

function mutationFailure(
  reason: unknown,
  evidence: LabelMutationEvidence,
  outcome: LabelWriteOutcome = evidence.recovery === 'rewrite' ? 'rejected' : 'uncertain'
) {
  const failure = providerFailure(reason);
  return new LabelRequestFailure(failure.kind, outcome, {
    ...(failure.code === undefined ? {} : { code: failure.code }),
    evidence
  });
}

function providerFailure(reason: unknown) {
  if (reason instanceof LabelRequestFailure) return reason;
  if (reason instanceof LabelTransportFailure || reason instanceof LabelContractError) {
    return toLabelRequestFailure(reason);
  }
  if (isRefineHttpError(reason)) {
    return new LabelRequestFailure(reason.kind === 'network' ? 'unavailable' : 'invalid', 'uncertain', {
      ...(typeof reason.code === 'string' ? { code: reason.code } : {})
    });
  }
  return new LabelRequestFailure('error', 'uncertain');
}

function transportFailureKind(reason: LabelTransportFailure): LabelFailureKind {
  if (reason.kind === 'unavailable') return 'unavailable';
  return reason.kind === 'rejected' ? 'error' : reason.kind;
}
