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
import { isLocalDateTime } from './alert-local-date-time';

import {
  AlertGroupContractError,
  type AlertGroupConverge,
  type AlertGroupPage,
  type AlertGroupQuery
} from '../model/alert-group-model';

const safeIntegerSchema = z.number().refine(Number.isSafeInteger, 'Expected a safe integer');
const positiveIntegerSchema = safeIntegerSchema.refine(value => value > 0, 'Expected a positive integer');
const nonNegativeIntegerSchema = safeIntegerSchema.refine(value => value >= 0, 'Expected a non-negative integer');
const nonBlankTextSchema = z.string().refine(value => Boolean(value.trim()), 'Expected non-blank text');
const uniqueLabelsSchema = z
  .array(nonBlankTextSchema)
  .refine(labels => new Set(labels).size === labels.length, 'Expected unique labels');
const nullableAuditTextSchema = z.string().nullable().optional();
const nullableLocalDateTimeSchema = z
  .string()
  .refine(isLocalDateTime, 'Expected a Java local date-time')
  .nullable()
  .optional();

// Unknown response fields are stripped deliberately. Alert Group reads expose
// the Java entity allowlist without coupling the UI to backend-only metadata.
const alertGroupSchema = z.object({
  id: positiveIntegerSchema,
  name: nonBlankTextSchema.max(100),
  groupLabels: uniqueLabelsSchema.nullable(),
  groupWait: nonNegativeIntegerSchema.nullable(),
  groupInterval: nonNegativeIntegerSchema.nullable(),
  repeatInterval: nonNegativeIntegerSchema.nullable(),
  enable: z.boolean().nullable(),
  creator: nullableAuditTextSchema,
  modifier: nullableAuditTextSchema,
  gmtCreate: nullableLocalDateTimeSchema,
  gmtUpdate: nullableLocalDateTimeSchema
});

const alertGroupPageSchema = z.object({
  content: z.array(alertGroupSchema),
  totalElements: nonNegativeIntegerSchema,
  totalPages: nonNegativeIntegerSchema,
  number: nonNegativeIntegerSchema,
  size: positiveIntegerSchema
});

export function parseAlertGroupDetail(value: unknown): AlertGroupConverge {
  return mapAlertGroup(parseSchema(alertGroupSchema, value, 'Alert group detail'));
}

export function parseAlertGroupPage(value: unknown, query: AlertGroupQuery): AlertGroupPage {
  const page = parseSchema(alertGroupPageSchema, value, 'Alert group page');
  // A structurally valid response for another request must not be rendered as
  // the current page. Query identity is part of the response contract.
  if (page.number !== query.pageIndex || page.size !== query.pageSize) {
    throw new AlertGroupContractError('Page does not match the request');
  }
  if (page.totalPages !== Math.ceil(page.totalElements / page.size)) {
    throw new AlertGroupContractError('totalPages is inconsistent');
  }
  // Ordinary Spring pages have an exact in-range cardinality; only pages beyond
  // the authoritative range may be empty.
  const expectedContentSize = Math.max(0, Math.min(page.size, page.totalElements - page.number * page.size));
  if (page.content.length !== expectedContentSize) {
    throw new AlertGroupContractError('Page content is inconsistent');
  }
  if (new Set(page.content.map(item => item.id)).size !== page.content.length) {
    throw new AlertGroupContractError('Duplicate ids are not allowed');
  }
  return { ...page, content: page.content.map(mapAlertGroup) };
}

function mapAlertGroup(source: z.output<typeof alertGroupSchema>): AlertGroupConverge {
  // exactOptionalPropertyTypes distinguishes an absent audit field from a field
  // explicitly set to undefined. Preserve absence while retaining authoritative null.
  return {
    id: source.id,
    name: source.name,
    groupLabels: source.groupLabels,
    groupWait: source.groupWait,
    groupInterval: source.groupInterval,
    repeatInterval: source.repeatInterval,
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
  throw new AlertGroupContractError(`${label} did not match the response contract`, { cause: result.error });
}
