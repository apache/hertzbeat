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

import { LabelContractError, type LabelPage, type LabelRecord } from '../model/label-model';

const safeIntegerSchema = z.number().refine(Number.isSafeInteger);
const positiveIntegerSchema = safeIntegerSchema.refine(value => value > 0);
const nonNegativeIntegerSchema = safeIntegerSchema.refine(value => value >= 0);
const nullableTextSchema = z.string().nullish();
const nullableTimestampSchema = z.string().nullish();
const sortWireSchema = z.object({ empty: z.boolean(), sorted: z.boolean(), unsorted: z.boolean() }).strict();

const labelWireSchema = z
  .object({
    id: positiveIntegerSchema,
    name: z.string().refine(value => value.trim().length > 0),
    tagValue: nullableTextSchema,
    description: nullableTextSchema,
    type: safeIntegerSchema.refine(value => value >= 0 && value <= 3).nullish(),
    creator: nullableTextSchema,
    modifier: nullableTextSchema,
    gmtCreate: nullableTimestampSchema,
    gmtUpdate: nullableTimestampSchema
  })
  .strict();

const labelPageWireSchema = z
  .object({
    content: z.array(labelWireSchema),
    pageable: z
      .object({
        pageNumber: nonNegativeIntegerSchema,
        pageSize: positiveIntegerSchema,
        sort: sortWireSchema,
        offset: nonNegativeIntegerSchema,
        paged: z.boolean(),
        unpaged: z.boolean()
      })
      .strict(),
    last: z.boolean(),
    totalPages: nonNegativeIntegerSchema,
    totalElements: nonNegativeIntegerSchema,
    size: positiveIntegerSchema,
    number: nonNegativeIntegerSchema,
    sort: sortWireSchema,
    first: z.boolean(),
    numberOfElements: nonNegativeIntegerSchema,
    empty: z.boolean()
  })
  .strict();

type LabelPageRequest = { pageIndex: number; pageSize: number };
type LabelWire = z.output<typeof labelWireSchema>;

export function parseLabelPage(value: unknown, request: LabelPageRequest): LabelPage {
  const result = labelPageWireSchema.safeParse(value);
  if (!result.success) throw new LabelContractError();

  const page = result.data;
  if (!validPageIdentity(page, request)) throw new LabelContractError('Label page identity is invalid');

  return {
    content: page.content.map(mapLabel),
    totalElements: page.totalElements,
    totalPages: page.totalPages,
    number: page.number,
    size: page.size
  };
}

export function parseLabelWriteReceipt(value: unknown) {
  if (!z.null().safeParse(value).success) throw new LabelContractError('Label write receipt is invalid');
  return null;
}

function validPageIdentity(page: z.output<typeof labelPageWireSchema>, request: LabelPageRequest) {
  const remainingElements = page.totalElements - page.number * page.size;
  const expectedContentSize = Math.max(0, Math.min(page.size, remainingElements));
  const checks = [
    page.number === request.pageIndex,
    page.size === request.pageSize,
    page.content.length === expectedContentSize,
    page.totalPages === Math.ceil(page.totalElements / page.size),
    page.numberOfElements === page.content.length,
    page.empty === (page.content.length === 0),
    page.first === (page.number === 0),
    page.last === page.number + 1 >= page.totalPages,
    page.pageable.pageNumber === page.number,
    page.pageable.pageSize === page.size,
    page.pageable.offset === page.number * page.size,
    page.pageable.paged,
    !page.pageable.unpaged,
    new Set(page.content.map(label => label.id)).size === page.content.length
  ];
  return checks.every(Boolean);
}

function mapLabel(wire: LabelWire): LabelRecord {
  return {
    id: wire.id,
    name: wire.name,
    ...(wire.tagValue == null ? {} : { tagValue: wire.tagValue }),
    ...(wire.description == null ? {} : { description: wire.description }),
    ...(wire.type == null ? {} : { type: wire.type }),
    ...(wire.creator == null ? {} : { creator: wire.creator }),
    ...(wire.modifier == null ? {} : { modifier: wire.modifier }),
    ...(wire.gmtCreate == null ? {} : { gmtCreate: wire.gmtCreate }),
    ...(wire.gmtUpdate == null ? {} : { gmtUpdate: wire.gmtUpdate })
  };
}
