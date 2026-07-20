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

import { alertSilencePageSizes, type AlertSilenceQuery } from '@/features/alert/alert-silence-model';

import { createRefineHttpError } from '../refine-http-error';

const safeIntegerSchema = z.number().refine(Number.isSafeInteger);
const positiveIntegerSchema = safeIntegerSchema.refine(value => value > 0);
const pageSizeSchema = z.union(alertSilencePageSizes.map(size => z.literal(size)));
const searchFilterSchema = z.object({
  field: z.literal('search'),
  operator: z.literal('contains'),
  value: z.string()
});
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
  const pageSize = parse(pageSizeSchema, params.pagination?.pageSize ?? 8, 'ALERT_SILENCE_PAGINATION_INVALID');
  let search = '';
  for (const filter of params.filters ?? []) {
    search = parse(searchFilterSchema, filter, 'ALERT_SILENCE_FILTER_UNSUPPORTED').value.trim();
  }
  return { search, pageIndex: currentPage - 1, pageSize };
}

export function readAlertSilenceId(value: string | number): number {
  return parse(positiveIntegerSchema, value, 'ALERT_SILENCE_ID_INVALID');
}

function parse<T extends z.ZodType>(schema: T, value: unknown, code: string): z.output<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw inputError(code);
}

function inputError(code: string) {
  return createRefineHttpError('Alert Silence input is invalid', 400, code);
}
