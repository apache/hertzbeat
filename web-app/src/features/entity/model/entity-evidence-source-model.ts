/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { EntityEvidenceSource, EntityUnifiedEvidence } from './entity-contract';

export type EntityEvidenceSourceState =
  { kind: 'unavailable' } | { kind: 'empty' } | { kind: 'ready'; rows: EntityEvidenceSource[] };

const sourceOrder: Record<EntityEvidenceSource['source'], number> = { monitor: 0, otlp: 1 };

/** Aggregate totals may merge signals, but provenance rows always retain their backend-owned source boundary. */
export function entityEvidenceSourceState(summary: EntityUnifiedEvidence | undefined): EntityEvidenceSourceState {
  if (!summary) return { kind: 'unavailable' };
  if (summary.sources.length === 0) return { kind: 'empty' };
  return {
    kind: 'ready',
    rows: [...summary.sources].sort((left, right) => sourceOrder[left.source] - sourceOrder[right.source])
  };
}
