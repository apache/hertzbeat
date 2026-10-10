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

import { z } from 'zod';

import {
  AlertContractError,
  alertStatuses,
  maximumAlertEvidenceIds,
  normalizeAlertEvidenceIds,
  type AlertGroupEvidence
} from '../model/alert-model';

const positiveIntegerSchema = z
  .number()
  .refine(Number.isSafeInteger, 'Expected a safe integer')
  .refine(value => value > 0, 'Expected a positive integer');

const alertGroupEvidenceSchema = z
  .object({
    groups: z
      .array(
        z
          .object({
            id: positiveIntegerSchema,
            status: z.enum(alertStatuses)
          })
          .strict()
      )
      .max(maximumAlertEvidenceIds),
    missingIds: z.array(positiveIntegerSchema).max(maximumAlertEvidenceIds),
    observedAt: positiveIntegerSchema
  })
  .strict();

export function parseAlertGroupEvidence(value: unknown, requestedIds: readonly number[]): AlertGroupEvidence {
  const canonicalIds = normalizeAlertEvidenceIds(requestedIds);
  const result = alertGroupEvidenceSchema.safeParse(value);
  if (!result.success) {
    throw new AlertContractError('Alert group evidence did not match the response contract', {
      cause: result.error
    });
  }
  const evidence = result.data;
  const groupIds = evidence.groups.map(group => group.id);
  const allEvidenceIds = [...groupIds, ...evidence.missingIds];
  if (new Set(groupIds).size !== groupIds.length || new Set(evidence.missingIds).size !== evidence.missingIds.length) {
    throw new AlertContractError('Duplicate alert evidence ids are not allowed');
  }
  if (!isStrictlyAscending(groupIds) || !isStrictlyAscending(evidence.missingIds)) {
    throw new AlertContractError('Alert evidence ids must be sorted');
  }
  const evidenceSet = new Set(allEvidenceIds);
  const requestedSet = new Set(canonicalIds);
  if (
    evidenceSet.size !== allEvidenceIds.length ||
    evidenceSet.size !== requestedSet.size ||
    [...evidenceSet].some(id => !requestedSet.has(id))
  ) {
    throw new AlertContractError('Alert group evidence does not exactly cover the request');
  }
  return evidence;
}

function isStrictlyAscending(ids: readonly number[]) {
  return ids.every((id, index) => index === 0 || ids[index - 1]! < id);
}
