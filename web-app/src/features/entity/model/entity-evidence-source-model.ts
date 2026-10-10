/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
