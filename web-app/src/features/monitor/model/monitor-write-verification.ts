/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

/**
 * Evidence collected after the server has already acknowledged a write.
 * Verification failure must never be reported as write failure because a
 * retry could duplicate a create or reverse an already committed mutation.
 */
export type MonitorWriteVerification<T> =
  | { kind: 'acknowledged' }
  | { kind: 'verified'; evidence: T }
  | { kind: 'unavailable'; evidence?: T }
  | { kind: 'error'; evidence?: T };
export type MonitorWriteProof<T> = Exclude<MonitorWriteVerification<T>, { kind: 'acknowledged' }>;

export function verifiedMonitorWrite<T>(evidence: T): { kind: 'verified'; evidence: T } {
  return { kind: 'verified', evidence };
}

export function acknowledgedMonitorWrite(): { kind: 'acknowledged' } {
  return { kind: 'acknowledged' };
}

export function unavailableMonitorWrite<T = never>(evidence?: T): { kind: 'unavailable'; evidence?: T } {
  return { kind: 'unavailable', ...(evidence === undefined ? {} : { evidence }) };
}

export function invalidMonitorWriteEvidence<T>(evidence?: T): { kind: 'error'; evidence?: T } {
  return { kind: 'error', ...(evidence === undefined ? {} : { evidence }) };
}
