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

import { AlertSummaryContractError, parseAlertSummaryWire } from '@/shared/alert-summary/alert-summary-contract';
import {
  AlertContractError,
  alertSeverities,
  alertStatuses,
  type AlertGroup,
  type AlertPage,
  type AlertQuery,
  type AlertSummary,
  type ServerLocalDateTime
} from './alert-model';

const safeIntegerSchema = z.number().refine(Number.isSafeInteger, 'Expected a safe integer');
const positiveIntegerSchema = safeIntegerSchema.refine(value => value > 0, 'Expected a positive integer');
const nonNegativeIntegerSchema = safeIntegerSchema.refine(value => value >= 0, 'Expected a non-negative integer');
const nullableStringMapSchema = z.record(z.string().min(1), z.string()).nullable();
const nullableStringArraySchema = z.array(z.string()).nullable();
const nullableServerLocalDateTimeSchema = z
  .string()
  .refine(isServerLocalDateTime, 'Expected the GroupAlert server-local date-time format')
  .nullable();

// GroupAlert contains persistence and hydration fields that the center does
// not consume. The schema allowlists only stable operator-facing evidence.
const alertGroupSchema = z.object({
  id: positiveIntegerSchema,
  status: z.enum(alertStatuses),
  groupLabels: nullableStringMapSchema,
  commonLabels: nullableStringMapSchema,
  commonAnnotations: nullableStringMapSchema,
  alertFingerprints: nullableStringArraySchema,
  gmtUpdate: nullableServerLocalDateTimeSchema
});

const alertGroupPageSchema = z.object({
  content: z.array(alertGroupSchema),
  totalElements: nonNegativeIntegerSchema,
  totalPages: nonNegativeIntegerSchema,
  number: nonNegativeIntegerSchema,
  size: positiveIntegerSchema
});

export function parseAlertSummary(value: unknown): AlertSummary {
  try {
    const summary = parseAlertSummaryWire(value);
    return {
      total: summary.total,
      dealNum: summary.dealNum,
      rate: summary.rate,
      priorityWarningNum: summary.priorityWarningNum,
      priorityCriticalNum: summary.priorityCriticalNum,
      priorityEmergencyNum: summary.priorityEmergencyNum
    };
  } catch (error) {
    if (error instanceof AlertSummaryContractError) {
      throw new AlertContractError(error.message, { cause: error });
    }
    throw error;
  }
}

export function parseAlertGroupPage(value: unknown, query: AlertQuery): AlertPage {
  const page = parseSchema(alertGroupPageSchema, value, 'Alert group page');
  // A valid page belonging to another request must not be rendered as current evidence.
  if (page.number !== query.pageIndex || page.size !== query.pageSize) {
    throw new AlertContractError('Page does not match the request');
  }
  if (page.totalPages !== Math.ceil(page.totalElements / page.size)) {
    throw new AlertContractError('totalPages is inconsistent');
  }
  const remaining = Math.max(0, page.totalElements - page.number * page.size);
  if (page.content.length > Math.min(page.size, remaining)) {
    throw new AlertContractError('Page content is inconsistent');
  }
  if (new Set(page.content.map(item => item.id)).size !== page.content.length) {
    throw new AlertContractError('Duplicate ids are not allowed');
  }
  return { ...page, content: page.content.map(mapAlertGroup) };
}

function mapAlertGroup(source: z.output<typeof alertGroupSchema>): AlertGroup {
  const severity = source.commonLabels?.severity;
  if (severity !== undefined && !alertSeverities.includes(severity as (typeof alertSeverities)[number])) {
    throw new AlertContractError('commonLabels severity is unsupported');
  }
  return {
    id: source.id,
    status: source.status,
    groupLabels: source.groupLabels,
    commonLabels: source.commonLabels,
    commonAnnotations: source.commonAnnotations,
    alertFingerprints: source.alertFingerprints,
    // JsonFormat makes this a server-local value with no zone. Branding at the
    // validated boundary prevents downstream code from treating it as an instant.
    gmtUpdate: source.gmtUpdate as ServerLocalDateTime | null
  };
}

function parseSchema<T extends z.ZodType>(schema: T, value: unknown, label: string): z.output<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new AlertContractError(`${label} did not match the response contract`, { cause: result.error });
}

function isServerLocalDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month) &&
    Number(match[4]) <= 23 &&
    Number(match[5]) <= 59 &&
    Number(match[6]) <= 59
  );
}

function daysInMonth(year: number, month: number) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
