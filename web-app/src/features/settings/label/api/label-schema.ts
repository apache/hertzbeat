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
  LabelContractError,
  type LabelPage,
  type LabelRecord
} from '../model/label-model';

const safeIntegerSchema = z.number().refine(Number.isSafeInteger);
const positiveIntegerSchema = safeIntegerSchema.refine(value => value > 0);
const nonNegativeIntegerSchema = safeIntegerSchema.refine(value => value >= 0);
const nullableTextSchema = z.string().nullish();
// Spring currently serializes LocalDateTime as text. Numeric timestamps remain
// accepted only because the pre-migration frontend contract supported them.
const nullableTimestampSchema = z.union([z.string(), z.number().finite()]).nullish();

const labelWireSchema = z.object({
  id: positiveIntegerSchema,
  name: z.string().refine(value => value.trim().length > 0),
  tagValue: nullableTextSchema,
  description: nullableTextSchema,
  type: safeIntegerSchema.refine(value => value >= 0 && value <= 3).nullish(),
  creator: nullableTextSchema,
  modifier: nullableTextSchema,
  gmtCreate: nullableTimestampSchema,
  gmtUpdate: nullableTimestampSchema
});

const labelPageWireSchema = z.object({
  content: z.array(labelWireSchema),
  totalElements: nonNegativeIntegerSchema,
  totalPages: nonNegativeIntegerSchema,
  number: nonNegativeIntegerSchema,
  size: positiveIntegerSchema
});

type LabelPageRequest = { pageIndex: number; pageSize: number };
type LabelWire = z.output<typeof labelWireSchema>;

export function parseLabelPage(value: unknown, request: LabelPageRequest): LabelPage {
  const result = labelPageWireSchema.safeParse(value);
  if (!result.success) throw new LabelContractError();

  const page = result.data;
  const expectedTotalPages = Math.ceil(page.totalElements / page.size);
  const remainingElements = page.totalElements - (page.number * page.size);
  const expectedContentSize = Math.max(0, Math.min(page.size, remainingElements));
  if (page.number !== request.pageIndex
    || page.size !== request.pageSize
    || page.content.length !== expectedContentSize
    || page.totalPages !== expectedTotalPages) {
    throw new LabelContractError('Label page identity is invalid');
  }

  return {
    content: page.content.map(mapLabel),
    totalElements: page.totalElements,
    totalPages: page.totalPages,
    number: page.number,
    size: page.size
  };
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
