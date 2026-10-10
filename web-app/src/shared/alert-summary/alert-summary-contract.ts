/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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

export const alertSummaryEndpoint = '/api/alerts/summary';

const fullPercentage = 100;
const twoDecimalFactor = 100;
const countSchema = z
  .number()
  .refine(Number.isSafeInteger, 'Expected a safe integer')
  .refine(value => value >= 0, 'Expected a non-negative integer');

const alertSummaryWireSchema = z.object({
  total: countSchema,
  dealNum: countSchema,
  rate: z.number().finite().min(0).max(fullPercentage),
  priorityWarningNum: countSchema,
  priorityCriticalNum: countSchema,
  priorityEmergencyNum: countSchema
});

export type AlertSummaryWire = z.output<typeof alertSummaryWireSchema>;

export class AlertSummaryContractError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AlertSummaryContractError';
  }
}

/**
 * Validates the backend summary once for every UI consumer. In addition to
 * field types, these invariants prevent contradictory counts or percentages
 * from being presented as operational evidence.
 */
export function parseAlertSummaryWire(value: unknown): AlertSummaryWire {
  const result = alertSummaryWireSchema.safeParse(value);
  if (!result.success) {
    throw new AlertSummaryContractError('Alert summary did not match the response contract', {
      cause: result.error
    });
  }

  const summary = result.data;
  const activeSeverityTotal = summary.priorityWarningNum + summary.priorityCriticalNum + summary.priorityEmergencyNum;
  if (summary.dealNum > summary.total || activeSeverityTotal > summary.total - summary.dealNum) {
    throw new AlertSummaryContractError('Alert summary counts are inconsistent');
  }

  const expectedRate = calculateBackendCompatibleRate(summary.total, summary.dealNum);
  if (roundHalfUpToTwoDecimals(summary.rate) !== expectedRate) {
    throw new AlertSummaryContractError('Alert summary rate is inconsistent');
  }
  return summary;
}

function calculateBackendCompatibleRate(total: number, dealNum: number) {
  if (total === 0) return fullPercentage;

  // AlertServiceImpl calculates with Java float before BigDecimal HALF_UP.
  // Preserve every binary32 boundary or large and near-half ratios will diverge.
  const floatDealNum = Math.fround(dealNum);
  const floatTotal = Math.fround(total);
  const percentage = Math.fround(Math.fround(fullPercentage * floatDealNum) / floatTotal);
  return roundHalfUpToTwoDecimals(percentage);
}

function roundHalfUpToTwoDecimals(value: number) {
  return Math.round((value + Number.EPSILON) * twoDecimalFactor) / twoDecimalFactor;
}
