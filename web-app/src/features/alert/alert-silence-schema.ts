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
  AlertSilenceContractError,
  AlertSilenceMissingError,
  type AlertSilence,
  type AlertSilencePage,
  type AlertSilenceQuery
} from './alert-silence-model';

const safeIntegerSchema = z.number().refine(Number.isSafeInteger, 'Expected a safe integer');
const positiveIntegerSchema = safeIntegerSchema.refine(value => value > 0, 'Expected a positive integer');
const nonNegativeIntegerSchema = safeIntegerSchema.refine(value => value >= 0, 'Expected a non-negative integer');
const nonBlankTextSchema = z.string().refine(value => Boolean(value.trim()), 'Expected non-blank text');
const nullableLabelsSchema = z.record(nonBlankTextSchema, z.string()).nullable();
const nullableDaysSchema = z.array(safeIntegerSchema.min(1).max(7))
  .refine(days => new Set(days).size === days.length, 'Expected unique days')
  .nullable();
const nullableOffsetDateTimeSchema = z.string()
  .refine(isOffsetDateTime, 'Expected a valid date-time with an explicit offset')
  .nullable();
const nullableAuditTextSchema = z.string().nullable().optional();
const nullableLocalDateTimeSchema = z.string()
  .refine(isLocalDateTime, 'Expected a valid Java local date-time')
  .nullable()
  .optional();

// Unknown fields are stripped so backend-only state cannot silently become a
// frontend domain field, while all public Java entity fields remain explicit.
const alertSilenceSchema = z.object({
  id: positiveIntegerSchema,
  name: nonBlankTextSchema.max(100),
  enable: z.boolean(),
  matchAll: z.boolean(),
  type: z.union([z.literal(0), z.literal(1)]),
  times: nonNegativeIntegerSchema.nullable(),
  labels: nullableLabelsSchema,
  days: nullableDaysSchema,
  periodStart: nullableOffsetDateTimeSchema,
  periodEnd: nullableOffsetDateTimeSchema,
  creator: nullableAuditTextSchema,
  modifier: nullableAuditTextSchema,
  gmtCreate: nullableLocalDateTimeSchema,
  gmtUpdate: nullableLocalDateTimeSchema
});

const alertSilencePageSchema = z.object({
  content: z.array(alertSilenceSchema),
  totalElements: nonNegativeIntegerSchema,
  totalPages: nonNegativeIntegerSchema,
  number: nonNegativeIntegerSchema,
  size: positiveIntegerSchema
});

export function parseAlertSilenceDetail(value: unknown): AlertSilence {
  if (value == null) throw new AlertSilenceMissingError();
  return mapAlertSilence(parseSchema(alertSilenceSchema, value, 'Alert silence detail'));
}

export function parseAlertSilencePage(value: unknown, query: AlertSilenceQuery): AlertSilencePage {
  const page = parseSchema(alertSilencePageSchema, value, 'Alert silence page');
  // Structurally valid evidence from another request is still stale evidence.
  if (page.number !== query.pageIndex || page.size !== query.pageSize) {
    throw new AlertSilenceContractError('Page does not match the request');
  }
  if (page.totalPages !== Math.ceil(page.totalElements / page.size)) {
    throw new AlertSilenceContractError('totalPages is inconsistent');
  }
  // Final-page capacity is bounded by the remaining authoritative row count.
  const availableContent = Math.max(0, page.totalElements - page.number * page.size);
  if (page.content.length > Math.min(page.size, availableContent)) {
    throw new AlertSilenceContractError('Page content is inconsistent');
  }
  if (new Set(page.content.map(item => item.id)).size !== page.content.length) {
    throw new AlertSilenceContractError('Duplicate ids are not allowed');
  }
  return { ...page, content: page.content.map(mapAlertSilence) };
}

function mapAlertSilence(source: z.output<typeof alertSilenceSchema>): AlertSilence {
  // Preserve an omitted audit field as absence and an explicit null as
  // authoritative persistence evidence.
  return {
    id: source.id,
    name: source.name,
    enable: source.enable,
    matchAll: source.matchAll,
    type: source.type,
    times: source.times,
    labels: source.labels,
    days: source.days,
    periodStart: source.periodStart,
    periodEnd: source.periodEnd,
    ...(source.creator === undefined ? {} : { creator: source.creator }),
    ...(source.modifier === undefined ? {} : { modifier: source.modifier }),
    ...(source.gmtCreate === undefined ? {} : { gmtCreate: source.gmtCreate }),
    ...(source.gmtUpdate === undefined ? {} : { gmtUpdate: source.gmtUpdate })
  };
}

function parseSchema<T extends z.ZodType>(schema: T, value: unknown, label: string): z.output<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new AlertSilenceContractError(`${label} did not match the response contract`, { cause: result.error });
}

function isLocalDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?$/.exec(value);
  return match !== null && hasValidCalendarFields(match);
}

function isOffsetDateTime(value: string) {
  // Date.parse normalizes impossible calendar dates on some engines. Parse the
  // Java ZonedDateTime fields directly before accepting its required offset.
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match || !hasValidCalendarFields(match)) return false;
  const offset = match[7];
  if (offset === 'Z') return true;
  const offsetHours = Number(offset?.slice(1, 3));
  const offsetMinutes = Number(offset?.slice(4, 6));
  return offsetHours <= 18 && offsetMinutes <= 59 && (offsetHours < 18 || offsetMinutes === 0);
}

function hasValidCalendarFields(match: RegExpExecArray) {
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return month >= 1 && month <= 12
    && day >= 1 && day <= daysInMonth(year, month)
    && Number(match[4]) <= 23
    && Number(match[5]) <= 59
    && Number(match[6] ?? '0') <= 59;
}

function daysInMonth(year: number, month: number) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
