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
  AlertRuleContractError,
  AlertRuleMissingError,
  alertRuleTypes,
  type AlertRule,
  type AlertRulePage,
  type AlertRuleQuery
} from '../model/alert-rule-model';

const safeIntegerSchema = z.number().refine(Number.isSafeInteger, 'Expected a safe integer');
const positiveIntegerSchema = safeIntegerSchema.refine(value => value > 0, 'Expected a positive integer');
const nonNegativeIntegerSchema = safeIntegerSchema.refine(value => value >= 0, 'Expected a non-negative integer');
const positiveJavaIntegerSchema = positiveIntegerSchema.max(2_147_483_647);
const nullableMapSchema = z
  .record(
    z.string().refine(key => Boolean(key.trim()), 'Expected a non-blank key'),
    z.string()
  )
  .nullable();
const nullableAuditTextSchema = z.string().nullable().optional();
const nullableLocalDateTimeSchema = z
  .string()
  .refine(isLocalDateTime, 'Expected a Java local date-time')
  .nullable()
  .optional();

// AlertDefine permits null and empty legacy fields even though new editor
// drafts require more. The wire schema describes persisted evidence, not new-input policy.
const alertRuleSchema = z.object({
  id: positiveIntegerSchema,
  name: z.string().max(100),
  type: z.enum(alertRuleTypes).nullable(),
  datasource: z.enum(['promql', 'sql']).nullable(),
  expr: z.string().max(2048).nullable(),
  period: positiveJavaIntegerSchema.nullable(),
  times: positiveJavaIntegerSchema.nullable(),
  labels: nullableMapSchema,
  annotations: nullableMapSchema,
  template: z.string().max(2048).nullable(),
  enable: z.boolean(),
  creator: nullableAuditTextSchema,
  modifier: nullableAuditTextSchema,
  gmtCreate: nullableLocalDateTimeSchema,
  gmtUpdate: nullableLocalDateTimeSchema
});

const alertRulePageSchema = z.object({
  content: z.array(alertRuleSchema),
  totalElements: nonNegativeIntegerSchema,
  totalPages: nonNegativeIntegerSchema,
  number: nonNegativeIntegerSchema,
  size: positiveIntegerSchema
});

const alertRulePreviewSchema = z.array(z.record(z.string(), z.unknown()));

export function parseAlertRuleDetail(value: unknown): AlertRule {
  if (value == null) throw new AlertRuleMissingError();
  return mapAlertRule(parseSchema(alertRuleSchema, value, 'Alert rule detail'));
}

export function parseAlertRulePage(value: unknown, query: AlertRuleQuery): AlertRulePage {
  const page = parseSchema(alertRulePageSchema, value, 'Alert rule page');
  // A structurally valid response for another request is stale evidence.
  if (page.number !== query.pageIndex || page.size !== query.pageSize) {
    throw new AlertRuleContractError('Page does not match the request');
  }
  if (page.totalPages !== Math.ceil(page.totalElements / page.size)) {
    throw new AlertRuleContractError('totalPages is inconsistent');
  }
  const remainingElements = Math.max(0, page.totalElements - page.number * page.size);
  const expectedContentSize = Math.min(page.size, remainingElements);
  if (page.content.length !== expectedContentSize) {
    throw new AlertRuleContractError('Page content is inconsistent');
  }
  if (new Set(page.content.map(item => item.id)).size !== page.content.length) {
    throw new AlertRuleContractError('Duplicate ids are not allowed');
  }
  return { ...page, content: page.content.map(mapAlertRule) };
}

export function parseAlertRulePreview(value: unknown): { matchCount: number } {
  const rows = parseSchema(alertRulePreviewSchema, value, 'Alert rule preview');
  // The editor only presents whether and how many rows matched. Discard the
  // backend rows here so arbitrary query output never becomes route state.
  return { matchCount: rows.length };
}

function mapAlertRule(source: z.output<typeof alertRuleSchema>): AlertRule {
  // Preserve true absence for optional audit fields while retaining explicit null.
  return {
    id: source.id,
    name: source.name,
    type: source.type,
    datasource: source.datasource,
    expr: source.expr,
    period: source.period,
    times: source.times,
    labels: source.labels,
    annotations: source.annotations,
    template: source.template,
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
  throw new AlertRuleContractError(`${label} did not match the response contract`, { cause: result.error });
}

function isLocalDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?$/.exec(value);
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
