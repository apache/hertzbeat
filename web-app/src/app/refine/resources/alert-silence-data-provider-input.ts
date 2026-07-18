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

import type { GetListParams } from '@refinedev/core';
import { z } from 'zod';

import {
  alertSilencePageSizes,
  validateAlertSilenceDraft,
  type AlertSilenceDraft,
  type AlertSilenceQuery
} from '@/features/alert/alert-silence-model';

import { createRefineHttpError } from '../refine-http-error';

export type AlertSilenceUpdateVariables = {
  draft: AlertSilenceDraft;
  query: AlertSilenceQuery;
} | {
  operation: 'toggle';
  enable: boolean;
  query: AlertSilenceQuery;
};

const safeIntegerSchema = z.number().refine(Number.isSafeInteger);
const positiveIntegerSchema = safeIntegerSchema.refine(value => value > 0);
const nonNegativeIntegerSchema = safeIntegerSchema.refine(value => value >= 0);
const pageSizeSchema = z.union(alertSilencePageSizes.map(size => z.literal(size)));
const searchFilterSchema = z.object({
  field: z.literal('search'),
  operator: z.literal('contains'),
  value: z.string()
});
const querySchema = z.object({
  search: z.string(),
  pageIndex: nonNegativeIntegerSchema,
  pageSize: pageSizeSchema
});
const draftSchema = z.object({
  id: positiveIntegerSchema.optional(),
  name: z.string(),
  enable: z.boolean(),
  matchAll: z.boolean(),
  type: z.union([z.literal(0), z.literal(1)]),
  labelsText: z.string(),
  days: z.array(safeIntegerSchema.min(1).max(7)),
  periodStart: z.string(),
  periodEnd: z.string()
}).superRefine((draft, context) => {
  const { id, ...fields } = draft;
  const candidate: AlertSilenceDraft = id === undefined ? fields : { ...fields, id };
  if (validateAlertSilenceDraft(candidate).length > 0) {
    context.addIssue({ code: 'custom', message: 'Draft failed domain validation' });
  }
});
const updateEnvelopeSchema = z.object({
  operation: z.unknown().optional(),
  enable: z.unknown().optional(),
  draft: z.unknown().optional(),
  query: z.unknown()
});
const deleteEnvelopeSchema = z.object({ query: z.unknown() });

export function readAlertSilenceListQuery(params: GetListParams): AlertSilenceQuery {
  if (params.sorters?.length) throw inputError('ALERT_SILENCE_SORT_UNSUPPORTED');
  if (params.pagination?.mode && params.pagination.mode !== 'server') {
    throw inputError('ALERT_SILENCE_PAGINATION_UNSUPPORTED');
  }
  const currentPage = parse(
    positiveIntegerSchema,
    params.pagination?.currentPage ?? 1,
    'ALERT_SILENCE_PAGINATION_INVALID'
  );
  const pageSize = parse(
    pageSizeSchema,
    params.pagination?.pageSize ?? 8,
    'ALERT_SILENCE_PAGINATION_INVALID'
  );
  let search = '';
  for (const filter of params.filters ?? []) {
    search = parse(searchFilterSchema, filter, 'ALERT_SILENCE_FILTER_UNSUPPORTED').value.trim();
  }
  return { search, pageIndex: currentPage - 1, pageSize };
}

export function readAlertSilenceUpdateVariables(value: unknown, id: number): AlertSilenceUpdateVariables {
  const source = parse(updateEnvelopeSchema, value, 'ALERT_SILENCE_VARIABLES_INVALID');
  const query = readQuery(source.query);
  if (source.operation === 'toggle') {
    return {
      operation: 'toggle',
      enable: parse(z.boolean(), source.enable, 'ALERT_SILENCE_VARIABLES_INVALID'),
      query
    };
  }
  return { draft: readAlertSilenceDraft(source.draft, id), query };
}

export function readAlertSilenceDeleteVariables(value: unknown): AlertSilenceQuery {
  const source = parse(deleteEnvelopeSchema, value, 'ALERT_SILENCE_VARIABLES_INVALID');
  return readQuery(source.query);
}

export function readAlertSilenceDraft(value: unknown, id?: number): AlertSilenceDraft {
  const source = parse(draftSchema, value, 'ALERT_SILENCE_VARIABLES_INVALID');
  const { id: sourceId, ...fields } = source;
  if (sourceId !== undefined && sourceId !== id) {
    throw inputError('ALERT_SILENCE_VARIABLES_INVALID');
  }
  return id === undefined ? fields : { ...fields, id };
}

export function readAlertSilenceId(value: string | number): number {
  return parse(positiveIntegerSchema, value, 'ALERT_SILENCE_ID_INVALID');
}

function readQuery(value: unknown): AlertSilenceQuery {
  return parse(querySchema, value, 'ALERT_SILENCE_VARIABLES_INVALID');
}

function parse<T extends z.ZodType>(schema: T, value: unknown, code: string): z.output<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw inputError(code);
}

function inputError(code: string) {
  return createRefineHttpError('Alert Silence input is invalid', 400, code);
}
