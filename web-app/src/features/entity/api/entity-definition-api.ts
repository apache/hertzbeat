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

import { apiMessageGet, apiMessagePost, apiMessagePut } from '@/core/http/api-message';
import { EntityContractError } from '../model/entity-contract';
import type { EntityDefinitionFormat, EntityDefinitionRequest } from '../model/entity-definition-model';
import { classifyEntityDefinitionError } from './entity-definition-error';
import { parseEditableEntityDto } from './entity-editor-schema';

const definitionTextSchema = z.string().refine(value => value.trim().length > 0);

export async function loadEntityDefinition(id: number, format: EntityDefinitionFormat, signal?: AbortSignal) {
  const value = await apiMessageGet(`${definitionBase(id)}?format=${format}`, signal ? { signal } : undefined);
  const result = definitionTextSchema.safeParse(value);
  if (!result.success) throw new EntityContractError('Resource definition response is invalid');
  return result.data;
}

export async function previewEntityDefinition(id: number, request: EntityDefinitionRequest, signal?: AbortSignal) {
  const value = await apiMessagePost(`${definitionBase(id)}/parse`, request, signal ? { signal } : undefined);
  return parseEditableEntityDto(value);
}

export async function saveEntityDefinition(id: number, request: EntityDefinitionRequest, signal?: AbortSignal) {
  const value = await apiMessagePut(definitionBase(id), request, signal ? { signal } : undefined);
  if (value !== null) throw new EntityContractError('Resource definition save response is invalid');
}

function definitionBase(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new EntityContractError('Resource definition request is invalid');
  return `/api/entities/${id}/definition`;
}

export { classifyEntityDefinitionError };
