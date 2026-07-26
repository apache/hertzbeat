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

import {
  AlertInhibitContractError,
  AlertInhibitMissingError,
  alertInhibitPrefillPageSize,
  type AlertInhibit,
  type AlertInhibitPrefillAlert,
  type AlertInhibitPage,
  type AlertInhibitQuery
} from '../model/alert-inhibit-model';

const safeIntegerSchema = z.number().refine(Number.isSafeInteger, 'Expected a safe integer');
const positiveIntegerSchema = safeIntegerSchema.refine(value => value > 0, 'Expected a positive integer');
const nonNegativeIntegerSchema = safeIntegerSchema.refine(value => value >= 0, 'Expected a non-negative integer');
const nonBlankTextSchema = z.string().refine(value => Boolean(value.trim()), 'Expected non-blank text');
const nullableLabelMapSchema = z.record(nonBlankTextSchema, z.string()).nullable();
const nullableEqualLabelsSchema = z
  .array(nonBlankTextSchema)
  .refine(labels => new Set(labels).size === labels.length, 'Expected unique labels')
  .nullable();
const nullableAuditTextSchema = z.string().nullable().optional();
const nullableLocalDateTimeSchema = z
  .string()
  .refine(isLocalDateTime, 'Expected a Java local date-time')
  .nullable()
  .optional();

// Unknown response fields are stripped deliberately. The UI consumes the
// public Java entity allowlist without retaining backend-only metadata.
const alertInhibitSchema = z.object({
  id: positiveIntegerSchema,
  name: nonBlankTextSchema.max(100),
  sourceLabels: nullableLabelMapSchema,
  targetLabels: nullableLabelMapSchema,
  equalLabels: nullableEqualLabelsSchema,
  enable: z.boolean().nullable(),
  creator: nullableAuditTextSchema,
  modifier: nullableAuditTextSchema,
  gmtCreate: nullableLocalDateTimeSchema,
  gmtUpdate: nullableLocalDateTimeSchema
});

const alertInhibitPageSchema = z.object({
  content: z.array(alertInhibitSchema),
  totalElements: nonNegativeIntegerSchema,
  totalPages: nonNegativeIntegerSchema,
  number: nonNegativeIntegerSchema,
  size: positiveIntegerSchema
});

const prefillAlertPageSchema = z.object({
  content: z.array(z.object({ id: positiveIntegerSchema, labels: nullableLabelMapSchema })),
  totalElements: nonNegativeIntegerSchema,
  totalPages: nonNegativeIntegerSchema,
  number: z.literal(0),
  size: z.literal(alertInhibitPrefillPageSize)
});

export function parseAlertInhibitDetail(value: unknown): AlertInhibit {
  if (value == null) throw new AlertInhibitMissingError();
  return mapAlertInhibit(parseSchema(alertInhibitSchema, value, 'Alert inhibit detail'));
}

export function parseAlertInhibitPage(value: unknown, query: AlertInhibitQuery): AlertInhibitPage {
  const page = parseSchema(alertInhibitPageSchema, value, 'Alert inhibit page');
  // A valid page for another request is stale evidence, so request identity is
  // enforced after structural parsing rather than inferred by the controller.
  if (page.number !== query.pageIndex || page.size !== query.pageSize) {
    throw new AlertInhibitContractError('Page does not match the request');
  }
  if (page.totalPages !== Math.ceil(page.totalElements / page.size)) {
    throw new AlertInhibitContractError('totalPages is inconsistent');
  }
  // Ordinary Spring pages have an exact in-range cardinality; only pages beyond
  // the authoritative range may be empty.
  const expectedContentSize = Math.max(0, Math.min(page.size, page.totalElements - page.number * page.size));
  if (page.content.length !== expectedContentSize) {
    throw new AlertInhibitContractError('Page content is inconsistent');
  }
  if (new Set(page.content.map(item => item.id)).size !== page.content.length) {
    throw new AlertInhibitContractError('Duplicate ids are not allowed');
  }
  return { ...page, content: page.content.map(mapAlertInhibit) };
}

export function parseAlertInhibitPrefillAlerts(value: unknown): AlertInhibitPrefillAlert[] {
  const page = parseSchema(prefillAlertPageSchema, value, 'Alert inhibit entity alert page');
  if (page.totalPages !== Math.ceil(page.totalElements / page.size)) {
    throw new AlertInhibitContractError('Entity alert totalPages is inconsistent');
  }
  const expectedSize = Math.min(page.size, page.totalElements);
  if (page.content.length !== expectedSize) {
    throw new AlertInhibitContractError('Entity alert page content is inconsistent');
  }
  if (new Set(page.content.map(alert => alert.id)).size !== page.content.length) {
    throw new AlertInhibitContractError('Duplicate entity alert ids are not allowed');
  }
  return page.content.map(alert => ({ labels: alert.labels }));
}

function mapAlertInhibit(source: z.output<typeof alertInhibitSchema>): AlertInhibit {
  // Preserve true absence for optional audit fields while retaining an explicit
  // null as authoritative persistence evidence.
  return {
    id: source.id,
    name: source.name,
    sourceLabels: source.sourceLabels,
    targetLabels: source.targetLabels,
    equalLabels: source.equalLabels,
    enable: source.enable,
    ...(source.creator === undefined ? {} : { creator: source.creator }),
    ...(source.modifier === undefined ? {} : { modifier: source.modifier }),
    ...(source.gmtCreate === undefined ? {} : { gmtCreate: source.gmtCreate }),
    ...(source.gmtUpdate === undefined ? {} : { gmtUpdate: source.gmtUpdate })
  };
}

function parseSchema<T extends z.ZodType>(schema: T, value: unknown, label: string): z.output<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new AlertInhibitContractError(`${label} did not match the response contract`, { cause: result.error });
}

function isLocalDateTime(value: string) {
  // Java LocalDateTime has no zone. Date.parse adds browser timezone semantics
  // and may normalize invalid dates, so validate its calendar fields directly.
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month) &&
    Number(hourText) <= 23 &&
    Number(minuteText) <= 59 &&
    Number(secondText) <= 59
  );
}

function daysInMonth(year: number, month: number) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
